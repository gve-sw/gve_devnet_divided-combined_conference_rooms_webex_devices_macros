/*
Copyright (c) 2022 Cisco and/or its affiliates.
This software is licensed to you under the terms of the Cisco Sample
Code License, Version 1.1 (the "License"). You may obtain a copy of the
License at
               https://developer.cisco.com/docs/licenses
All use of the material herein must be in accordance with the terms of
the License. All rights not expressly granted by the License are
reserved. Unless required by applicable law or agreed to separately in
writing, software distributed under the License is distributed on an "AS
IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
or implied.
*/

const xapi = require('xapi');
import { GMM } from './GMM_Lib'


/*
 TODOs:
1) Macro issues many of the same commands at least twice when setting the voltage on pin 4 and then in the handler of that voltage. 
There does not seem to be good consistency: Enrico: PLEASE clean up indeed!  Enrico will find out what the "rules " are for when 
there are wall sensor vs. Touch 10 manual request conflicts. 

2) Review the limitations I imposed to Input 2 and mic8 in PRIMARY and video inputs 3 and 4 in secondary so splitter macro does not conflict

3) Make sure the way we turn on and off vuMeters does not conflict with how USB v3 Macro does it or at least listen to messages from it to coordinate
*/




// This is the standalone verions of the join/split macro meant to work together with the switcher, ducker and USBMode macros
// via events on the same codec and across codecs with the GMM library
// Communications needed to keep the codec awake and set the correct video layouts is delegated to the switcher macro it depends on
// which should be installed on the same codecs
// IMPORTANT: Turn on the JoinSplit macro on the Primary codec before turning it on in secondary to give the macro a chance
// to set PIN 4 to the correct Join/Split state according to what is stored in permanent storage.


/////////////////////////////////////////////////////////////////////////////////////////
// CONSTANTS/ENUMS
/////////////////////////////////////////////////////////////////////////////////////////


// The JOIN_SPLIT_ROOM_ROLE const tells the macro in the particular codec it is running
// what role it should play; JS_PRIMARY or JS_SECONDARY
const JS_PRIMARY=1, JS_SECONDARY=2, JS_NONE=0

// Specify here the IP and local user account credentials of PRIMARY (room 1) or SECONDARY (room 2) codec depending on which
// one this is. This will be stored in persistent memory for the switcher macro to use instead of it's own
// main/aux settings when not working with joinsplit
// Here are instructions on how to configure local user accounts on Webex Devices: https://help.webex.com/en-us/jkhs20/Local-User-Administration-on-Room-and-Desk-Devices)
// THESE ACCOUNTS ARE USED FOR HTTP POST COMMUNICATIONS.
// Also specify the room role for this particular codec in ROOM_ROLE (JS_PRIMARY or JS_SECONDARY)
// and the input ID to use on the primary for the video tie line from secondary in PRIMARY_VIDEO_TIELINE_INPUT_FROM_SEC_ID (typically 3)
const JOIN_SPLIT_CONFIG = {
  ROOM_ROLE : JS_PRIMARY,
  PRIMARY_VIDEO_TIELINE_INPUT_FROM_SEC_ID: 3,
  OTHER_CODEC_IP : '10.0.0.100',
  OTHER_CODEC_USER : '',
  OTHER_CODEC_PWD : ''
}

// USE_WALL_SENSOR controls if you use a physical wall sensor or not
// If set to false, you will get a custom panel to manually switch rooms from join to split
// If set to true, you will get a PIN protected override button, in case the wall sensor is broken
// and you need to override manually
const USE_WALL_SENSOR=false

/*
  Change the override protect PINs here if  USE_WALL_SENSOR=true above
*/
const COMBINE_PIN = "1234";
const SPLIT_PIN = "4321";
const FIXED_SENSOR="5678";


// SECONDARY_SPLIT_MODE_VIDEO_MONITORS contains the option for the 'Video Monitors' setting 
// for when in split mode which can be 'Single', 'Dual' or 'Triple'
//TODO: on Secondary, store away number of monitors configured before going combined
// so we can set back to what it was. This should be upon config so should not need permanent
// storage, but if it does, then will have to retrieve current value, store in GMM and 
// retrieve again which is more time consuming than this constant
const SECONDARY_SPLIT_MODE_VIDEO_MONITORS='Dual'

// Change SECONDARY_COMBINED_VOLUME_CHANGE_STEPS if you want to adjust the volume on the secondary
// codec when switching modes. 
const SECONDARY_COMBINED_VOLUME_CHANGE_STEPS=10

// USE_ALTERNATE_COMBINED_PRESENTERTRACK_SETTINGS speficies if different settings should be used for presentertrack on primary codec
// for combined and split modes. If set to true, you must modify the settings for presentertrack to use for each scenario in the 
// SPLIT_PRESENTERTRACK_SETTINGS and COMBINED_PRESENTERTRACK_SETTINGS object constants below. 
// Instructions on how setup and to obtain the settings from the primary codec can be found in 
// the "How_to_Setup_Two-PresenterTrack_Zones.pdf" document in the same repository for this macro. 
const USE_ALTERNATE_COMBINED_PRESENTERTRACK_SETTINGS=false;
const SPLIT_PRESENTERTRACK_SETTINGS = {
  PAN : -1000,
  TILT: -309,
  ZOOM: 4104,
  TRIGGERZONE: '0,95,400,850'
} //Replace these placeholder values with your actual values.
const COMBINED_PRESENTERTRACK_SETTINGS = {
  PAN : -1378,
  TILT: -309,
  ZOOM: 4104,
  TRIGGERZONE: '0,89,549,898'
} //Replace these placeholder values with your actual values.



/////////////////////////////////////////////////////////////////////////////////////////
// THIS NEXT SECTION CREATES A SEPARATE MACRO FOR NON-VOLATILE MEMORY "Memory_Storage"
// IF THE MACRO ALREADY EXISTS, THIS SECTION DOES NOTHING
/////////////////////////////////////////////////////////////////////////////////////////
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}



// communication between primary and secondary for purposes of combined mode is happening via GPIO Pins
// creation of otherCodec object it is still here as a reference to be used by the modified switcher macro.
const otherCodec = new GMM.Connect.IP(JOIN_SPLIT_CONFIG.OTHER_CODEC_USER, JOIN_SPLIT_CONFIG.OTHER_CODEC_PWD, JOIN_SPLIT_CONFIG.OTHER_CODEC_IP)

const localCallout = new GMM.Connect.Local(module.name.replace('./', ''))

/////////////////////////////////////////////////////////////////////////////////////////
// VARIABLES
/////////////////////////////////////////////////////////////////////////////////////////


//var inCall = false; //no longer needed since VoiceSwitch handles details of mic monitoring and switching while in call. 


// roomCombined keeps the current state of join/split for the codec. It is normally also reflected in 
// permanent storage (GMMMemory macro) in the JoinSplit_combinedState global
var roomCombined = false;

// wallSensorOverride keeps the current state of the wall sensor functionality. If it is working well it is set to false
// If users detect a failure of the sensor, they will use the wall sensor override custom panel (PIN based or toggle button based)
// and from then on the macro will ignore the wall sensor input on GPIO PIN 1. 
// The value of this boolean will always be reflected in permanent storage (GMMMemory macro) in the JoinSplit_wallSensorOverride global
// Once the wall sensor is repaired, somebody with access to this macro will have to manually edit the Memory_Storage macro file and set 
// JoinSplit_wallSensorOverride to false and re-start the macro
var wallSensorOverride = false;



/**
  * The following functions allow the ability to set the Pins High or Low
**/
function setGPIOPin2ToHigh() {
  xapi.command('GPIO ManualState Set', {Pin2: 'High'}).catch(e=>console.debug(e));
  console.log('Pin 2 has been set to High; MUTE is inactive');
}

function setGPIOPin2ToLow() {
  xapi.command('GPIO ManualState Set', {Pin2: 'Low'}).catch(e=>console.debug(e));
  console.log('Pin 2 has been set to Low; MUTE is active');
}

function setGPIOPin3ToHigh() {
  xapi.command('GPIO ManualState Set', {Pin3: 'High'}).catch(e=>console.debug(e));
  console.log('Pin 3 has been set to High; STANDBY is inactive');
}

function setGPIOPin3ToLow() {
  xapi.command('GPIO ManualState Set', {Pin3: 'Low'}).catch(e=>console.debug(e));
  console.log('Pin 3 has been set to Low; STANDBY is active');
}

function setGPIOPin4ToHigh() {
  xapi.command('GPIO ManualState Set', {Pin4: 'High'}).catch(e=>console.debug(e));
  console.log('Pin 4 has been set to High; Rooms are Standalone');
}

function setGPIOPin4ToLow() {
  xapi.command('GPIO ManualState Set', {Pin4: 'Low'}).catch(e=>console.debug(e));
  console.log('Pin 4 has been set to Low; Rooms are Combined');
}

function setCombinedMode(combinedValue) {
    roomCombined = combinedValue;
    GMM.write.global('JoinSplit_combinedState',roomCombined).then(() => {
      console.log({ Message: 'ChangeState', Action: 'Combined state stored.' })
    })

}

function setWallSensorOverride(overrideValue) {
  wallSensorOverride = overrideValue;
  GMM.write.global('JoinSplit_wallSensorOverride',wallSensorOverride).then(() => {
    console.log({ Message: 'ChangeState', Action: 'Wall Sensor Override state stored.' })
  })

}


function setSecondaryUltrasoundMaxVolume(ultraSoundMaxValue) {
  let secondaryUltrasoundMax = ultraSoundMaxValue;
  GMM.write.global('JoinSplit_secondaryUltrasoundMax',secondaryUltrasoundMax).then(() => {
    console.log({ Message: 'ChangeState', Action: 'secondary Ultrasound Max volume stored.' })
  })

}


/**
  * This will initialize the room state to Combined or Divided based on the partition sensor
**/
//TODO remove checkInitialWallSensorState() when confirmed no longer needed
function checkInitialWallSensorState() {
  Promise.all([xapi.status.get('GPIO Pin 1')]).then(promises => {
    let [pin1] = promises;
    console.log('Pin1: '+ pin1.State);
        // Change all these to whatever is needed to trigger on the Primary when it goes into combined
      if (pin1.State === 'Low') {
        console.log('Primary Room is in Combined Mode');
        if (JOIN_SPLIT_CONFIG.ROOM_ROLE===JS_PRIMARY) {
            primaryCombinedMode();
            setGPIOPin4ToLow();
            if (!USE_WALL_SENSOR) {
            xapi.command('UserInterface Extensions Widget SetValue', {WidgetId: 'widget_toggle_combine', Value: 'On'}); }
        }
        setCombinedMode(true);
      }else {
        console.log('Primary Room is in Divided Mode');
        if (JOIN_SPLIT_CONFIG.ROOM_ROLE===JS_PRIMARY) {
            setPrimaryDefaultConfig();
            setGPIOPin4ToHigh();
        }
        setCombinedMode(false);
      }
  }).catch(e=>console.debug(e));
}


/**
  * This will initialize the room state to Combined or Divided based on the setting in Memory Macro (persistent storage)
**/
function initialCombinedJoinState() {
        // Change all these to whatever is needed to trigger on the Primary when it goes into combined
      if (roomCombined) {
        console.log('Primary Room is in Combined Mode');
        if (JOIN_SPLIT_CONFIG.ROOM_ROLE===JS_PRIMARY) {
            primaryCombinedMode();
            setGPIOPin4ToLow();
            if (!USE_WALL_SENSOR) {
            xapi.command('UserInterface Extensions Widget SetValue', {WidgetId: 'widget_toggle_combine', Value: 'On'}); }
        }
        setCombinedMode(true);
      }else {
        console.log('Primary Room is in Divided Mode');
        if (JOIN_SPLIT_CONFIG.ROOM_ROLE===JS_PRIMARY) {
            setPrimaryDefaultConfig();
            setGPIOPin4ToHigh();
        }
        setCombinedMode(false);
      }
}


/**
  * This will initialize the room state to Combined or Divided based on the Pin 4 set by Primary
**/
function checkCombinedStateSecondary() {
  Promise.all([xapi.status.get('GPIO Pin 4')]).then(promises => {
    let [pin4] = promises;
    console.log('Pin4: '+ pin4.State);
        // Change all these to whatever is needed to trigger on the Secondary when it goes into combined
      if (pin4.State === 'Low') {
        console.log('Secondary Room is in Combined Mode');
        secondaryCombinedMode();
        displayWarning();
        //setCombinedMode(true);
        roomCombined=true;
      }else {
        console.log('Secondary Room is in Divided Mode');
        secondaryStandaloneMode();
        removeWarning();
        //setCombinedMode(false);
        roomCombined=false;
      }
  }).catch(e=>console.debug(e));
}

/**
  * The following functions display a message on the touch panel to alert the users
  * that the rooms are either being separated or joined together
**/
function alertJoinedScreen() {
  xapi.command('UserInterface Message Alert Display', {
    Title: 'Combining Rooms ...',
    Text: 'Please wait',
    Duration: 10,
  });
}

function alertSplitScreen() {
  xapi.command('UserInterface Message Alert Display', {
    Title: 'Dividing Rooms ...',
    Text: 'Please wait',
    Duration: 10,
  });
}

/**
  * Partition Sensor
  * This will check Pin 1 and listen when the state of the pin changes
**/
function primaryInitPartitionSensor() {
  xapi.status.on('GPIO Pin 1', (state) => {
    console.log(`GPIO Pin 1[${state.id}] State went to: ${state.State}`);
    if (wallSensorOverride) {
      console.log('wallSensorOverride is set to true; ignoring Pin1 state......')
    } 
    else
    {
        if (state.State === 'Low') {
            alertJoinedScreen();
            console.log('Primary Switched to Combined Mode [Partition Sensor]');
            if (JOIN_SPLIT_CONFIG.ROOM_ROLE===JS_PRIMARY) {
                primaryCombinedMode();
                setGPIOPin4ToLow();
                if (!USE_WALL_SENSOR) {
                xapi.command('UserInterface Extensions Widget SetValue', {WidgetId: 'widget_toggle_combine', Value: 'On'}); }
            }
            setCombinedMode(true);
        }
        else if (state.State === 'High') {
            alertSplitScreen();
            console.log('Primary Switched to Divided Mode [Partition Sensor]');
            if (JOIN_SPLIT_CONFIG.ROOM_ROLE===JS_PRIMARY) {
                primaryStandaloneMode();
                //primaryCodecSendScreen();
                setGPIOPin4ToHigh();
                if (!USE_WALL_SENSOR) {
                xapi.command('UserInterface Extensions Widget SetValue', {WidgetId: 'widget_toggle_combine', Value: 'Off'});}
            }
            setCombinedMode(false);
        }
      }
  });
}

/////////////////////////////////////////////////////////////////////////////////////////
// DEFAULT ENDPOINT CONFIGURATIONS
// UPON SYSTEM STARTUP, these configurations should be run, They set a baseline for
// settings that we do not want the users to change.
/////////////////////////////////////////////////////////////////////////////////////////

function setPrimaryDefaultConfig() {

  console.log("Primary default config being run");

  xapi.config.set('Audio Input ARC 1 Mode', 'Off')
    .catch((error) => { console.error("1"+error); });
  xapi.config.set('Audio Input ARC 2 Mode', 'Off')
    .catch((error) => { console.error("2"+error); });
  xapi.config.set('Audio Input ARC 3 Mode', 'Off')
    .catch((error) => { console.error("3"+error); });

// HDMI AUDIO SECTION
  xapi.config.set('Audio Input HDMI 1 Mode', 'Off')
    .catch((error) => { console.error("4"+error); });
  xapi.config.set('Audio Input HDMI 2 Mode', 'Off')
    .catch((error) => { console.error("5"+error); });

// SET MICROPHONES
// MICROPHONES 1 THRU 7 ARE USER CONFIGURABLE

// MIC 8
// THIS IS THE INPUT FOR THE MICROPHONES FROM THE SECONDARY CODEC
xapi.config.set('Audio Input Microphone 8 Channel', 'Mono')
    .catch((error) => { console.error("6"+error); });
  xapi.config.set('Audio Input Microphone 8 EchoControl Dereverberation', 'Off')
    .catch((error) => { console.error("7"+error); });
  xapi.config.set('Audio Input Microphone 8 EchoControl Mode', 'On')
    .catch((error) => { console.error("8"+error); });
  xapi.config.set('Audio Input Microphone 8 EchoControl NoiseReduction', 'Off')
    .catch((error) => { console.error("9"+error); });
  xapi.config.set('Audio Input Microphone 8 Level', '18')
    .catch((error) => { console.error("10"+error); });
  xapi.config.set('Audio Input Microphone 8 Mode', 'Off')
    .catch((error) => { console.error("11"+error); });
  xapi.config.set('Audio Input Microphone 8 PhantomPower', 'Off')
    .catch((error) => { console.error("12"+error); });

// MUTE
  xapi.config.set('Audio Microphones Mute Enabled', 'True')
    .catch((error) => { console.error("13"+error); });

// OUTPUT ARC SECTION (FOR QUAD CAMERA ONLY)
  xapi.config.set('Audio Output ARC 1 Mode', 'On')
    .catch((error) => { console.error("14"+error); });

// HDMI AUDIO OUTPUT
 xapi.Config.Audio.Output.ConnectorSetup.set('Manual');

  xapi.config.set('Audio Output HDMI 1 Mode', 'On')
    .catch((error) => { console.error("15"+error); });
    // This is for embedded conference audio over to Secondary
    // It should be switched on and off on Secondary input
  xapi.config.set('Audio Output HDMI 2 Mode', 'Off')
    .catch((error) => { console.error("16"+error); });
  xapi.config.set('Audio Output HDMI 3 Mode', 'On')
    .catch((error) => { console.error("17"+error); });
    // This allows use of USB Passthrough

// CONFERENCE
  xapi.config.set('Conference AutoAnswer Mode', 'Off')
    .catch((error) => { console.error("31"+error); });
  //xapi.config.set('Conference FarEndControl Mode', 'Off')
  //  .catch((error) => { console.error("32"+error); });

// GPIO
  xapi.config.set('GPIO Pin 1 Mode', 'InputNoAction')
    .catch((error) => { console.error("33"+error); });
  xapi.config.set('GPIO Pin 2 Mode', 'OutputManualState')
    .catch((error) => { console.error("34"+error); });
  xapi.config.set('GPIO Pin 3 Mode', 'OutputManualState')
    .catch((error) => { console.error("35"+error); });
  xapi.config.set('GPIO Pin 4 Mode', 'OutputManualState')
    .catch((error) => { console.error("36"+error); });

// MACROS
  xapi.config.set('Macros AutoStart', 'On')
    .catch((error) => { console.error("37"+error); });
  xapi.config.set('Macros Mode', 'On')
    .catch((error) => { console.error("38"+error); });

// PERIPHERALS
  xapi.config.set('Peripherals Profile Cameras', 'Minimum1')
    .catch((error) => { console.error("39"+error); });
  xapi.config.set('Peripherals Profile TouchPanels', 'Minimum1')
    .catch((error) => { console.error("40"+error); });

// SERIAL PORT
  xapi.config.set('SerialPort LoginRequired', 'Off')
    .catch((error) => { console.error("41"+error); });
  xapi.config.set('SerialPort Mode', 'On')
    .catch((error) => { console.error("42"+error); });

// STANDBY
  // xapi.config.set('Standby Control', 'On')
    //  .catch((error) => { console.error("43"+error); });
  // xapi.config.set('Standby WakeupOnMotionDetection', 'Off')
    // .catch((error) => { console.error("44"+error); });
    // This needs to be stored in memory on the Secondary, along with halfwake.
    // All should be disabled when in Combined mode, and restored when Standalone.

// VIDEO
  xapi.config.set('Video DefaultMainSource', '1')
    .catch((error) => { console.error("45"+error); });
  //xapi.command('Video Input SetMainVideoSource', {  ConnectorID: 1 }).catch((error) => { console.error("47"+error); }); //TODO Enrico testing
  xapi.command('Video Input SetMainVideoSource', {  SourceID : JOIN_SPLIT_CONFIG.PRIMARY_VIDEO_TIELINE_INPUT_FROM_SEC_ID, SourceID: 1 }).catch((error) => { console.error("47"+error); }); //TODO Enrico testing
  xapi.command('Video Selfview Set', {Mode: 'Off'})
    .catch((error) => { console.error("48"+error); });

// VIDEO INPUT SECTION
// HDMI INPUT 1
  xapi.config.set('Video Input Connector 1 CameraControl CameraId', '1')
    .catch((error) => { console.error("49"+error); });
  xapi.config.set('Video Input Connector 1 CameraControl Mode', 'On')
    .catch((error) => { console.error("50"+error); });
  xapi.config.set('Video Input Connector 1 InputSourceType', 'camera')
    .catch((error) => { console.error("51"+error); });
  xapi.config.set('Video Input Connector 1 Name', 'Quad Camera')
    .catch((error) => { console.error("52"+error); });
  xapi.config.set('Video Input Connector 1 PreferredResolution', '1920_1080_60')
    .catch((error) => { console.error("53"+error); });
  xapi.config.set('Video Input Connector 1 PresentationSelection', 'Manual')
    .catch((error) => { console.error("54"+error); });
  xapi.config.set('Video Input Connector 1 Quality', 'Motion')
    .catch((error) => { console.error("55"+error); });
  xapi.config.set('Video Input Connector 1 Visibility', 'Never')
  .catch((error) => { console.error("56"+error); });

// HDMI INPUT 2
// THIS IS THE CAMERA FROM THE SECONDARY ROOM
  xapi.config.set(`Video Input Connector ${JOIN_SPLIT_CONFIG.PRIMARY_VIDEO_TIELINE_INPUT_FROM_SEC_ID} HDCP Mode`, 'Off')
    .catch((error) => { console.error("57"+error); });
  xapi.config.set(`Video Input Connector ${JOIN_SPLIT_CONFIG.PRIMARY_VIDEO_TIELINE_INPUT_FROM_SEC_ID} CameraControl Mode`, 'Off')
    .catch((error) => { console.error("58"+error); });
  xapi.config.set(`Video Input Connector ${JOIN_SPLIT_CONFIG.PRIMARY_VIDEO_TIELINE_INPUT_FROM_SEC_ID} InputSourceType`, 'other')
    .catch((error) => { console.error("59"+error); });
  xapi.config.set(`Video Input Connector ${JOIN_SPLIT_CONFIG.PRIMARY_VIDEO_TIELINE_INPUT_FROM_SEC_ID} Name`, 'Selfview Secondary')
    .catch((error) => { console.error("60"+error); });
  xapi.config.set(`Video Input Connector ${JOIN_SPLIT_CONFIG.PRIMARY_VIDEO_TIELINE_INPUT_FROM_SEC_ID} PreferredResolution`, '1920_1080_60')
    .catch((error) => { console.error("61"+error); });
  xapi.config.set(`Video Input Connector ${JOIN_SPLIT_CONFIG.PRIMARY_VIDEO_TIELINE_INPUT_FROM_SEC_ID} PresentationSelection`, 'Manual')
    .catch((error) => { console.error("62"+error); });
  xapi.config.set(`Video Input Connector ${JOIN_SPLIT_CONFIG.PRIMARY_VIDEO_TIELINE_INPUT_FROM_SEC_ID} Quality`, 'Motion')
    .catch((error) => { console.error("63"+error); });
  xapi.config.set(`Video Input Connector ${JOIN_SPLIT_CONFIG.PRIMARY_VIDEO_TIELINE_INPUT_FROM_SEC_ID} Visibility`, 'Never')
    .catch((error) => { console.error("64"+error); });

// HDMI INPUT 3, 4, and 5 SHOULD BE CONFIGURED FROM THE WEB INTERFACE
// SDI INPUT 6 SHOULD ALSO BE CONFIGURED FROM THE WEB INTERFACE
// SDI INPUT 6 IS THE PREFERRED INPUT FOR PRESENTER TRACK


// VIDEO OUTPUT SECTION
// THESE SHOULD NOT BE CONFIGURED BY THE INSTALLER
  xapi.config.set('Video Output Connector 3 MonitorRole', 'Auto')
    .catch((error) => { console.error("69"+error); });
    // Secondary Codec - Monitor 3 role must be set for THIRD
}

function setSecondaryDefaultConfig() {

  console.log("Secondary default config being run");

  xapi.config.set('Audio Input ARC 1 Mode', 'Off')
    .catch((error) => { console.error("1"+error); });
  xapi.config.set('Audio Input ARC 2 Mode', 'Off')
    .catch((error) => { console.error("2"+error); });
  xapi.config.set('Audio Input ARC 3 Mode', 'Off')
    .catch((error) => { console.error("3"+error); });


// HDMI AUDIO SECTION
  xapi.Config.Audio.Output.ConnectorSetup.set('Manual');
  xapi.config.set('Audio Input HDMI 1 Mode', 'Off')
    .catch((error) => { console.error("4"+error); });
  xapi.config.set('Audio Input HDMI 3 Mode', 'On')
    .catch((error) => { console.error("5"+error); });

// SET MICROPHONES
// MICROPHONES 1 THRU 8 ARE USER CONFIGURABLE
// THIS NEW VERSION 2 DESIGN USES EMBEDDED HDMI AUDIO FROM PRIMARY TO SECONDARY

// MUTE
  xapi.config.set('Audio Microphones Mute Enabled', 'True')
    .catch((error) => { console.error("21"+error); });

// OUTPUT ARC SECTION (FOR QUAD CAMERA ONLY)
  xapi.config.set('Audio Output ARC 1 Mode', 'On')
    .catch((error) => { console.error("22"+error); });

// HDMI AUDIO OUTPUT
  xapi.config.set('Audio Output HDMI 1 Mode', 'Off')
    .catch((error) => { console.error("23"+error); });
  xapi.config.set('Audio Output HDMI 2 Mode', 'Off')
    .catch((error) => { console.error("24"+error); });
  xapi.config.set('Audio Output HDMI 3 Mode', 'On')
    .catch((error) => { console.error("25"+error); });
    // This allows use of USB Passthrough

// CONFERENCE
  xapi.config.set('Conference AutoAnswer Mode', 'Off')
    .catch((error) => { console.error("36"+error); });

// GPIO
  xapi.config.set('GPIO Pin 2 Mode', 'InputNoAction')
    .catch((error) => { console.error("39"+error); });
  xapi.config.set('GPIO Pin 3 Mode', 'InputNoAction')
    .catch((error) => { console.error("40"+error); });
  xapi.config.set('GPIO Pin 4 Mode', 'InputNoAction')
    .catch((error) => { console.error("41"+error); });

// MACROS
  xapi.config.set('Macros AutoStart', 'On')
    .catch((error) => { console.error("42"+error); });
  xapi.config.set('Macros Mode', 'On')
    .catch((error) => { console.error("43"+error); });

// PERIPHERALS
  xapi.config.set('Peripherals Profile Cameras', 'Minimum1')
    .catch((error) => { console.error("44"+error); });
  xapi.config.set('Peripherals Profile TouchPanels', 'Minimum1')
    .catch((error) => { console.error("45"+error); });

// SERIAL PORT
  xapi.config.set('SerialPort LoginRequired', 'Off')
    .catch((error) => { console.error("46"+error); });
  xapi.config.set('SerialPort Mode', 'On')
    .catch((error) => { console.error("47"+error); });

// STANDBY
  xapi.config.set('Standby Control', 'On').catch((error) => { console.error("48"+error); }); 
  xapi.config.set('Standby WakeupOnMotionDetection', 'Off')
    .catch((error) => { console.error("49"+error); });

// VIDEO
xapi.config.set('Video DefaultMainSource', '1')
    .catch((error) => { console.error("50"+error); });
  xapi.config.set('Video Monitors', SECONDARY_SPLIT_MODE_VIDEO_MONITORS)
    .catch((error) => { console.error("51"+error); });
  xapi.command('Video Input SetMainVideoSource', {  ConnectorID: 1 })
    .catch((error) => { console.error("52"+error); });
  xapi.command('Video Selfview Set', {Mode: 'Off'})
    .catch((error) => { console.error("53"+error); });

// VIDEO INPUT SECTION
// HDMI INPUT 1
  xapi.config.set('Video Input Connector 1 CameraControl CameraId', '1')
    .catch((error) => { console.error("54"+error); });
  xapi.config.set('Video Input Connector 1 CameraControl Mode', 'On')
    .catch((error) => { console.error("55"+error); });
  xapi.config.set('Video Input Connector 1 InputSourceType', 'camera')
    .catch((error) => { console.error("56"+error); });
  xapi.config.set('Video Input Connector 1 Name', 'Quad Camera')
    .catch((error) => { console.error("57"+error); });
  xapi.config.set('Video Input Connector 1 PreferredResolution', '1920_1080_60')
    .catch((error) => { console.error("58"+error); });
  xapi.config.set('Video Input Connector 1 PresentationSelection', 'Manual')
    .catch((error) => { console.error("59"+error); });
  xapi.config.set('Video Input Connector 1 Quality', 'Motion')
    .catch((error) => { console.error("60"+error); });
  xapi.config.set('Video Input Connector 1 Visibility', 'Never')
    .catch((error) => { console.error("61"+error); });

// HDMI INPUTS 3 AND 4
// THESE ARE SCREENS 1 AND 2 FROM THE PRIMARY ROOM
  xapi.config.set('Video Input Connector 3 HDCP Mode', 'Off')
    .catch((error) => { console.error("62"+error); });
  xapi.config.set('Video Input Connector 3 CameraControl Mode', 'Off')
    .catch((error) => { console.error("63"+error); });
  xapi.config.set('Video Input Connector 3 InputSourceType', 'Other')
    .catch((error) => { console.error("64"+error); });
  xapi.config.set('Video Input Connector 3 Name', 'Main Video Primary')
    .catch((error) => { console.error("65"+error); });
  xapi.config.set('Video Input Connector 3 PreferredResolution', '3840_2160_30')
    .catch((error) => { console.error("66"+error); });
  xapi.config.set('Video Input Connector 3 PresentationSelection', 'Manual')
    .catch((error) => { console.error("67"+error); });
  xapi.config.set('Video Input Connector 3 Quality', 'Sharpness')
    .catch((error) => { console.error("68"+error); });
  xapi.config.set('Video Input Connector 3 Visibility', 'Never')
    .catch((error) => { console.error("69"+error); });

  xapi.config.set('Video Input Connector 4 HDCP Mode', 'Off')
    .catch((error) => { console.error("70"+error); });
  xapi.config.set('Video Input Connector 4 CameraControl Mode', 'Off')
    .catch((error) => { console.error("71"+error); });
  xapi.config.set('Video Input Connector 4 InputSourceType', 'PC')
    .catch((error) => { console.error("72"+error); });
  xapi.config.set('Video Input Connector 4 Name', 'Content Primary')
    .catch((error) => { console.error("73"+error); });
  xapi.config.set('Video Input Connector 4 PreferredResolution', '3840_2160_30')
    .catch((error) => { console.error("74"+error); });
  xapi.config.set('Video Input Connector 4 PresentationSelection', 'Manual')
    .catch((error) => { console.error("75"+error); });
  xapi.config.set('Video Input Connector 4 Quality', 'Sharpness')
    .catch((error) => { console.error("76"+error); });
  xapi.config.set('Video Input Connector 4 Visibility', 'Never')
    .catch((error) => { console.error("77"+error); });

// HDMI INPUT 2 and 5 SHOULD BE CONFIGURED FROM THE WEB INTERFACE
// SDI INPUT 6 SHOULD ALSO BE CONFIGURED FROM THE WEB INTERFACE
// SDI INPUT 6 IS THE PREFERRED INPUT FOR PRESENTER TRACK

// VIDEO OUTPUT SECTION
// THESE SHOULD NOT BE CONFIGURED BY THE INSTALLER
  xapi.config.set('Video Output Connector 3 MonitorRole', 'Third')
    .catch((error) => { console.error("82"+error); });
  xapi.config.set('Video Output Connector 3 Resolution', 'Auto')
    .catch((error) => { console.error("83"+error); });

  xapi.command('Video Matrix Reset')
    .catch((error) => { console.error("84"+error); });
}

/////////////////////////////////////////////////////////////////////////////////////////
// INITIALIZATION
/////////////////////////////////////////////////////////////////////////////////////////




async function init()
{
  console.log('init');

  await GMM.memoryInit();

  await GMM.write.global('JOIN_SPLIT_CONFIG', JOIN_SPLIT_CONFIG).then(() => {
      console.log({ Message: 'Init', Action: 'Join Split config stored.' })
    });

  if (JOIN_SPLIT_CONFIG.ROOM_ROLE===JS_PRIMARY) {
    roomCombined=await GMM.read.global('JoinSplit_combinedState').catch(async e=>{
      //console.error(e);
      console.log("No initial JoinSplit_combinedState global detected, creating one...")
      await GMM.write.global('JoinSplit_combinedState',false).then(() => {
        console.log({ Message: 'Init', Action: 'Combined state stored.' })
      })
      return false;
    })

    if (USE_WALL_SENSOR) {
      wallSensorOverride=await GMM.read.global('JoinSplit_wallSensorOverride').catch(async e=>{
              //console.error(e);
              console.log("No initial JoinSplit_wallSensorOverride global detected, creating one...")
              await GMM.write.global('JoinSplit_wallSensorOverride',false).then(() => {
                console.log({ Message: 'Init', Action: 'Wall Sensor override state stored.' })
              })
            return false;
          })  
    }
    else 
    {
        // if they are not using a wall sensor, we want the same behavior than if they
        // had set the override for the wall sensor: to just ignore it
        setWallSensorOverride(true); // this also sets wallSensorOverride to true
    }
  }

  if (JOIN_SPLIT_CONFIG.ROOM_ROLE===JS_PRIMARY) {
              // Add CUSTOM PANEL
              if (USE_WALL_SENSOR) {
                //first remove the full toggle custom panel if already there
                xapi.Command.UserInterface.Extensions.Panel.Remove({ PanelId: 'panel_combine_split' });
                //then create the PIN based custom panel
                xapi.Command.UserInterface.Extensions.Panel.Save({ PanelId: 'room_combine_PIN' },
                `<Extensions><Version>1.8</Version>
                <Panel>
                  <Order>2</Order>
                  <PanelId>room_combine_PIN</PanelId>
                  <Type>Home</Type>
                  <Icon>Sliders</Icon>
                  <Color>#CF7900</Color>
                  <Name>Wall Sensor Override Control</Name>
                  <ActivityType>Custom</ActivityType>
                </Panel>        
                </Extensions>`);
              }
              else {
              // first remove PIN based custom panel if already there
              xapi.Command.UserInterface.Extensions.Panel.Remove({ PanelId: 'room_combine_PIN' });
              // then create the toggle based custom panel
              xapi.Command.UserInterface.Extensions.Panel.Save({ PanelId: 'panel_combine_split' },
              `<Extensions><Version>1.8</Version>
                  <Panel>
                  <Order>2</Order>
                  <PanelId>panel_combine_split</PanelId>
                  <Origin>local</Origin>
                  <Type>Home</Type>
                  <Icon>Sliders</Icon>
                  <Color>#00D6A2</Color>
                  <Name>Room Combine Control</Name>
                  <ActivityType>Custom</ActivityType>
                  <Page>
                    <Name>Room Combine Control</Name>
                    <Row>
                      <Name>Row</Name>
                      <Widget>
                        <WidgetId>widget_text_combine</WidgetId>
                        <Name>Room combine</Name>
                        <Type>Text</Type>
                        <Options>size=2;fontSize=normal;align=center</Options>
                      </Widget>
                      <Widget>
                        <WidgetId>widget_toggle_combine</WidgetId>
                        <Type>ToggleButton</Type>
                        <Options>size=1</Options>
                      </Widget>
                    </Row>
                    <Options>hideRowNames=1</Options>
                  </Page>
                </Panel>          
              </Extensions>`);
              if (roomCombined) {
                xapi.command('UserInterface Extensions Widget SetValue', {WidgetId: 'widget_toggle_combine', Value: 'on'});
              }
              else
              {
                xapi.command('UserInterface Extensions Widget SetValue', {WidgetId: 'widget_toggle_combine' , Value: 'off'});
              }
            }
            // setPrimaryDefaultConfig() is called within initialCombinedJoinState() if appropriate
            initialCombinedJoinState();

            // start listening to events on GPIO pin 1 that come from the wall sensor connected to PRIMARY
            primaryInitPartitionSensor();

            //setTimeout(setPrimaryGPIOconfig, 1000);
            //primaryStandaloneMode();

            // start sensing changes in PIN 4 to switch room modes. This can be set by wall sensor
            // or custom touch10 UI on PRIMARY codec
            primaryInitModeChangeSensing();

            listenToStandby();
            listenToMute();

        }
    else {
            setSecondaryDefaultConfig();
            // start sensing changes in PIN 4 to switch room modes. This can be set by wall sensor
            // or custom touch10 UI on PRIMARY codec
            secondaryInitModeChangeSensing();
            secondaryStandbyControl();
            secondaryMuteControl();
            checkCombinedStateSecondary();
      }

}



/////////////////////////////////////////////////////////////////////////////////////////
// TOUCH 10 UI FUNCTION HANDLERS
/////////////////////////////////////////////////////////////////////////////////////////

xapi.event.on('UserInterface Extensions Widget Action', (event) =>
{
  console.log("JoinSplit " + event.WidgetId + ' set to ' + event.Value);

  if(event.Value === 'on' && event.WidgetId == 'widget_toggle_combine')
  {
      setGPIOPin4ToLow();

  }
  else if(event.Value === 'off' && event.WidgetId == 'widget_toggle_combine')
  {
      setGPIOPin4ToHigh();
  }
});

xapi.event.on('UserInterface Extensions Panel Clicked', (event) =>
{
    if(event.PanelId == 'room_combine_PIN')
    {
      console.log("Room Combine PIN button clicked");
      xapi.command("UserInterface Message TextInput Display",
      {
        Title: "Wall Sensor Override Control",
        Text: 'Please input the necessary PIN to Split,Combine or report fixed sensor:',
        FeedbackId: 'roomCombine',
        InputType: 'PIN',
        SubmitText: 'Submit'
      }).catch((error) => { console.error(error); });
    }
});

xapi.event.on('UserInterface Message TextInput Response', (event) =>
{
  switch(event.FeedbackId)
  {
    case 'roomCombine':
      switch(event.Text)
      {
        case COMBINE_PIN:
          if (JOIN_SPLIT_CONFIG.ROOM_ROLE===JS_PRIMARY)
          {
            setGPIOPin4ToLow();
            setCombinedMode(true);
            // once they manually set the combined/join state, we must 
            // store the override state in persistent memory
            setWallSensorOverride(true);
          }
        break;

        case SPLIT_PIN:
          if (JOIN_SPLIT_CONFIG.ROOM_ROLE===JS_PRIMARY)
          {
            setGPIOPin4ToHigh();
            setCombinedMode(false);
            // once they manually set the combined/join state, we must 
            // store the override state in persistent memory
            setWallSensorOverride(true);
          }
        break;

        case FIXED_SENSOR:
          if (JOIN_SPLIT_CONFIG.ROOM_ROLE===JS_PRIMARY)
          {
            // once a broken sensor is reported fixed, just set 
            //  the override state in persistent memory to false
            // must then manually open/close sensor to set room to right state
            setWallSensorOverride(false);
          }
        break;

        default:
          xapi.command("UserInterface Message Alert Display",
          {
            Title: 'Incorrect Pin',
            Text: 'Please contact administrator to adjust room settings',
            Duration: 3
          });
      }
  }
});


function primaryInitModeChangeSensing() {
  xapi.status.on('GPIO Pin 4', (state) => {
    console.log(`GPIO Pin 4[${state.id}] State went to: ${state.State}`);
        if (state.State === 'Low') {
            alertJoinedScreen();
            console.log('Primary Switched to Combined Mode [Pin 4]');
            primaryCombinedMode();
            setCombinedMode(true);
        }
        else if (state.State === 'High') {
            alertSplitScreen();
            console.log('Primary Switched to Divided Mode [Pin 4]');
            primaryStandaloneMode();
            setCombinedMode(false);
        }
  });
}

function secondaryInitModeChangeSensing() {
  xapi.status.on('GPIO Pin 4', (state) => {
    console.log(`GPIO Pin 4[${state.id}] State went to: ${state.State}`);
        if (state.State === 'Low') {
            displayWarning();
            console.log('Secondary Switched to Combined Mode [Pin 4]');
            secondaryCombinedMode();
        }
        else if (state.State === 'High') {
            removeWarning();
            console.log('Secondary Switched to Divided Mode [Pin 4]');
            secondaryStandaloneMode();
        }
  });
}


function listenToMute() {
  xapi.Status.Audio.Microphones.Mute.on(value => {
    console.log("Global Mute: " + value);
    if(roomCombined === true){
      //if(inCall === true) { //TODO: check to see if we can eliminate inCall checking
        if(value === 'On') {
          setGPIOPin2ToLow();
        }
        else if (value === 'Off') {
          setGPIOPin2ToHigh();
        }
      }
    //}
  });
}

function listenToStandby() {
  xapi.status.on('Standby State', (state) => {
    console.log("Standby State: " + state);
    if(roomCombined === true){
      //if(inCall === false) { //TODO: check to see if we can eliminate inCall checking
        if(state === 'Standby') {
          setGPIOPin3ToLow();
        }
        else if (state === 'Off') {
          setGPIOPin3ToHigh();
        }
      //}
    }
  });
}

function secondaryStandbyControl() {
  //TODO: Make sure this does not conflict with switcher macro monitoring Standby
  xapi.status.on('GPIO Pin 3', (state) => {
    console.log(`GPIO Pin 3[${state.id}] State went to: ${state.State}`);
        if (state.State === 'Low') {
            xapi.command('Standby Activate');
        }
        else if (state.State === 'High') {
            xapi.command('Standby Deactivate');
        }
  });
}

function secondaryMuteControl() {
  //TODO: Make sure this does not conflict with switcher macro monitoring Mute
  xapi.status.on('GPIO Pin 2', (state) => {
    console.log(`GPIO Pin 2[${state.id}] State went to: ${state.State}`);
        if (state.State === 'Low') {
            xapi.command('Audio Microphones Mute')
        }
        else if (state.State === 'High') {
            xapi.command('Audio Microphones Unmute ')
        }
  });
}


/////////////////////////////////////////////////////////////////////////////////////////
// SWITCH BETWEEN COMBINED AND STANDALONE
/////////////////////////////////////////////////////////////////////////////////////////

function primaryCombinedMode()
{
  xapi.config.set('Audio Input Microphone 8 Mode', 'On')
    .catch((error) => { console.error(error); });
  xapi.config.set('Conference FarEndControl Mode', 'Off')
    .catch((error) => { console.error("32"+error); });

  xapi.Command.Video.Selfview.Set({ Mode: 'Off' }); // TODO Enrico testing
  xapi.command('Video Matrix Reset').catch((error) => { console.error(error); }); // TODO Enrico testing

  if (USE_ALTERNATE_COMBINED_PRESENTERTRACK_SETTINGS) {
    xapi.Config.Cameras.PresenterTrack.CameraPosition.Pan
    .set(COMBINED_PRESENTERTRACK_SETTINGS.PAN);
    xapi.Config.Cameras.PresenterTrack.CameraPosition.Tilt
        .set(COMBINED_PRESENTERTRACK_SETTINGS.TILT);
    xapi.Config.Cameras.PresenterTrack.CameraPosition.Zoom
        .set(COMBINED_PRESENTERTRACK_SETTINGS.ZOOM);
    xapi.Config.Cameras.PresenterTrack.TriggerZone
        .set(COMBINED_PRESENTERTRACK_SETTINGS.TRIGGERZONE);
  }

    //Tell the codec in the SECONDARY room to go to combined mode
    otherCodec.command('COMBINED').post()

    //Alert local macros that need to know that the room is joining, mostly the switcher macro
    let gmm_status={
    'Action': 'ROOMS_JOINED',
    'roomRole': JOIN_SPLIT_CONFIG.ROOM_ROLE  //this is just a placeholder for any other info we might want to send
    }
    localCallout.status(gmm_status).post()

	// Secondary HDMI input 3 audio should be enabled, Wake on motion turned off,
	// and Ultrasound vol set to zero
	// THIS MEANS THESE VALUES MUST BE WRITTEN INTO MEMORY EVERY TIME COMBINED MODE IS ACTIVATED, BEFORE BEING CHANGED
}

function primaryStandaloneMode()
{
  xapi.config.set('Audio Input Microphone 8 Mode', 'Off')
    .catch((error) => { console.error(error); });
  xapi.config.set('Conference FarEndControl Mode', 'On')
    .catch((error) => { console.error("32"+error); });

  if (USE_ALTERNATE_COMBINED_PRESENTERTRACK_SETTINGS) {
    xapi.Config.Cameras.PresenterTrack.CameraPosition.Pan
    .set(SPLIT_PRESENTERTRACK_SETTINGS.PAN);
    xapi.Config.Cameras.PresenterTrack.CameraPosition.Tilt
        .set(SPLIT_PRESENTERTRACK_SETTINGS.TILT);
    xapi.Config.Cameras.PresenterTrack.CameraPosition.Zoom
        .set(SPLIT_PRESENTERTRACK_SETTINGS.ZOOM);
    xapi.Config.Cameras.PresenterTrack.TriggerZone
        .set(SPLIT_PRESENTERTRACK_SETTINGS.TRIGGERZONE);
  }
    //Tell the codec in the SECONDARY room to go to split mode
    otherCodec.command('SPLIT').post()

    //Alert local macros that need to know that the room is splitting, mostly the switcher macro
    let gmm_status={
    'Action': 'ROOMS_SPLIT',
    'roomRole': JOIN_SPLIT_CONFIG.ROOM_ROLE  //this is just a placeholder for any other info we might want to send
    }
    localCallout.status(gmm_status).post()

	// Secondary HDMI input 3 audio should be disabled, Wake on motion restored to previous value,
	// and Ultrasound vol set to prev value
	// THIS MEANS THOSE VALUES SHOULD BE RETRIEVED FROM MEMORY
}

async function secondaryStandaloneMode()
{
  //setCombinedMode(false);
  roomCombined=false;
  xapi.config.set('Audio Output Line 5 Mode', 'Off')
    .catch((error) => { console.error(error); });
  /*
 SET ultrasound volume to stored value
 SET halfwakd mode to stored value
 SET WeakuOnMotionDetect to stored value
  */

 // decrease main volume by 5Db since it was increased by the same when combining rooms
 xapi.Command.Audio.Volume.Decrease({ Steps:  SECONDARY_COMBINED_VOLUME_CHANGE_STEPS});
 //Restore ultrasound volume if previously stored
 let secondaryUltrasoundMax=await GMM.read.global('JoinSplit_secondaryUltrasoundMax').catch(async e=>{
      console.log("No JoinSplit_secondaryUltrasoundMax global detected.")
      return -1;
    })
  if (secondaryUltrasoundMax>=0) {
    xapi.Config.Audio.Ultrasound.MaxVolume.set(secondaryUltrasoundMax);
  }

  xapi.command('Conference DoNotDisturb Deactivate')
    .catch((error) => { console.error(error); });
  xapi.Config.Video.Monitors.set(SECONDARY_SPLIT_MODE_VIDEO_MONITORS); // TODO Enrico testing
  xapi.command('Video Matrix Reset', { Output: 1 })
    .catch((error) => { console.error(error); });
  xapi.config.set('Standby Control', 'On').catch((error) => { console.error(error); });
  xapi.config.set('UserInterface OSD Mode', 'Auto')
    .catch((error) => { console.error("90"+error); });
  let gmm_status={
    'Action': 'ROOMS_SPLIT',
    'roomRole': JOIN_SPLIT_CONFIG.ROOM_ROLE  //this is just a placeholder for any other info we might want to send
    }
    localCallout.status(gmm_status).post()
}

async function secondaryCombinedMode()
{
  //setCombinedMode(true);
  roomCombined=true;
  xapi.config.set('UserInterface OSD Mode', 'Unobstructed')
    .catch((error) => { console.error("91"+error); });
  xapi.config.set('Audio Output Line 5 Mode', 'On')
    .catch((error) => { console.error(error); });

  // increase main volume by 5db, will decrease upon splitting again
  xapi.Command.Audio.Volume.Increase({ Steps: SECONDARY_COMBINED_VOLUME_CHANGE_STEPS});

  //grab current ultrasound Max Volume  
  let ultraSoundMaxValue = await xapi.Config.Audio.Ultrasound.MaxVolume.get()

  // store it away in persistent storage
  setSecondaryUltrasoundMaxVolume(ultraSoundMaxValue);
  
  xapi.config.set('Audio Ultrasound MaxVolume', '0')
    .catch((error) => { console.error(error); }); // This is so that nobody can pair
  // with the codec when Combined

  /*
 SET ultrasound volume to zero
 SET halfwakd mode to manual
 SET WeakuOnMotionDetect to off
  */

  xapi.command('Conference DoNotDisturb Activate')
    .catch((error) => { console.error(error); });
  xapi.Config.Video.Monitors.set('Triple'); // TODO Enrico testing
  xapi.command('Video Matrix Reset').catch((error) => { console.error(error); }); // TODO Enrico testing
  xapi.command('Video Matrix Assign', { Output: 3, SourceID: 1 }).catch((error) => { console.error(error); });
  xapi.command('Video Matrix Assign', { Output: 1, SourceID: 3 }).catch((error) => { console.error(error); });
  xapi.command('Video Matrix Assign', { Output: 2, SourceID: 4 }).catch((error) => { console.error(error); });
  xapi.config.set('Standby Control', 'Off').catch((error) => { console.error(error); }); 
  let gmm_status={
    'Action': 'ROOMS_JOINED',
    'roomRole': JOIN_SPLIT_CONFIG.ROOM_ROLE  //this is just a placeholder for any other info we might want to send
    }
  localCallout.status(gmm_status).post()
}
/////////////////////////////////////////////////////////////////////////////////////////
// ERROR HANDLING
/////////////////////////////////////////////////////////////////////////////////////////

function handleError(error)
{
  console.log(error);
}


/////////////////////////////////////////////////////////////////////////////////////////
// OTHER FUNCTIONAL HANDLERS
/////////////////////////////////////////////////////////////////////////////////////////

xapi.event.on('UserInterface Message Prompt Response', (event) =>
{
  switch(event.FeedbackId){
    case 'displayPrompt':
      if (roomCombined === true) {
          console.log("Redisplaying the prompt");
          xapi.command("UserInterface Message Prompt Display", {
            Title: 'Combined Mode',
            Text: 'This codec is in combined mode',
            FeedbackId: 'displayPrompt',
            'Option.1':'Please use main Touch Panel',
          }).catch((error) => { console.error(error); });
        }
    break;
  }
});

xapi.event.on('UserInterface Message Prompt Cleared', (event) =>
{
  switch(event.FeedbackId){
    case 'displayPrompt':
      if (roomCombined === true) {
          console.log("Redisplaying the prompt");
          xapi.command("UserInterface Message Prompt Display", {
            Title: 'Combined Mode',
            Text: 'This codec is in combined mode',
            FeedbackId: 'displayPrompt',
            'Option.1':'Please use main Touch Panel',
          }).catch((error) => { console.error(error); });
        }
    break;
  }
});

function displayWarning()
{
  xapi.command('UserInterface Message Prompt Display', {
        Title: 'Combined Mode',
        Text: 'This codec is in combined mode',
        FeedbackId: 'displayPrompt',
        'Option.1':'Please use main Touch Panel'
      }).catch((error) => { console.error(error); });
  xapi.config.set('UserInterface Features HideAll', 'True')
    .catch((error) => { console.error(error); });
}

function removeWarning()
{
  xapi.command("UserInterface Message Prompt Clear");
  xapi.config.set('UserInterface Features HideAll', 'False')
    .catch((error) => { console.error(error); });
}

//leftover from Beta Room_2_Macro that would be called when post message was received from primary to divide
// not using at the moment
function secondaryRunDivideLogic()
{
  console.log('Secondary Room is in Divided Mode');
  //setSecondaryDefaultConfig();
  secondaryStandaloneMode();
  removeWarning();
}

//leftover from Beta Room_2_Macro that would be called when post message was received from primary to divide
// not using at the moment
function secondaryRunCombineLogic()
{
  console.log('Secondary Room is in Combined Mode');
  secondaryCombinedMode();
  displayWarning();
}

// ---------------------- MACROS

// for now this is just showing that we are are able to emit split/combined commands from this macro,
// it should be replicated as such in the switcher macro
GMM.Event.Receiver.on(event => {
          switch (event.App) { //Based on the App (Macro Name), I'll run some code
            case 'JoinSplit':
              if (event.Type == 'Error') {
                console.error(event)
              } else {
                switch (event.Value) {
                  case 'ROOMS_SPLIT':
                    console.warn(`Room switching to split mode`)
                    break;
                  case 'ROOMS_JOINED':
                    console.warn(`Room switching to joined mode`)
                    break;
                  case 'COMBINED':
                    //TODO: this command we recieve should be redundant, validate
                      console.warn(`Received COMBINED command via HTTP to join rooms. Should already be handled elsewhere`)
                    break;
                  case 'SPLIT':
                    //TODO: this command we recieve should be redundant, validate
                      console.warn(`Received SPLIT command via HTTP to split rooms. Should already be handled elsewhere`)
                    break;
                  default:
                    break;
                }
              }
              break;
            default:
              console.debug({
                Message: `Received Message from ${event.App} and was not processed`
              })
              break;
          }
        })


/////////////////////////////////////////////////////////////////////////////////////////
// INVOCATION OF INIT() TO START THE MACRO
/////////////////////////////////////////////////////////////////////////////////////////

init();
