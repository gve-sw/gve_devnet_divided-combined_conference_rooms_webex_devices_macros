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
/////////////////////////////////////////////////////////////////////////////////////////
// REQUIREMENTS
/////////////////////////////////////////////////////////////////////////////////////////

const xapi = require('xapi');
import { GMM } from './GMM_Lib'

 //TODO: Make sure the way we turn on and off vuMeters does not conflict with how USB v3 Macro does it or at least listen to messages from it to coordinate

/*
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+ This switcher module of the Divided-Combined Conference Room macro
+ is based on the Executive Room Voice Activated Switching macro
+ published at:
+ https://github.com/gve-sw/gve_devnet_webex_devices_executive_room_voice_activated_switching_macro
+ It will eventually be the standalone version of the Executive Room Voice Activated Switching macro
+ In the context of the Divided-Combined Conference Room macro, it needs to be configured as needed
+ for when the rooms are SEPARATE or SPLIT following the restrictions imposed by the Join-Split room design
+ The macro will change the switching behavior of both the primary and secondary rooms when in combined
+ mode and switch back to what you configure here when the rooms are split again. 
+ IMPORTANT: Turn on the JoinSplit and VoiceSwitch macros on the Primary codec before turning them on
+ in the secondary since permanent memory storage in the Primary contains the correct combined or split
+ state of the rooms in case the devices reset or power cycle and need to revert to that persistent state. 
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
*/

/////////////////////////////////////////////////////////////////////////////////////////
// INSTALLER SETTINGS
/////////////////////////////////////////////////////////////////////////////////////////


/*
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+ SECTION 1 - SECTION 1 - SECTION 1 - SECTION 1 - SECTION 1 - SECTION 1 +
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
*/


// The SWITCHER_ROLE const tells the macro in the particular codec it is running
// what role it should play; SWITCHER_MAIN or SWITCHER_AUX
//NOTE: if you install the JoinSplit macro on the same codec, this role MUSt be SWITCHER_MAIN
const SWITCHER_MAIN=1, SWITCHER_AUX=2
const SWITCHER_ROLE=SWITCHER_MAIN

// Specify here the IP and local user account credentials of MAIN or AUX codec depending on which
// one this is.
// Here are instructions on how to configure local user accounts on Webex Devices: https://help.webex.com/en-us/jkhs20/Local-User-Administration-on-Room-and-Desk-Devices)
// THESE ACCOUNTS ARE USED FOR HTTP POST COMMUNICATIONS.
// NOTE: if there is no auxiliary codec or you are using the JoinSplit macro on the same codec, 
// you must set the value of OTHER_SWITCHER_CODEC_IP to ''
const OTHER_SWITCHER_CODEC_IP='10.0.0.10'
const OTHER_SWITCHER_CODEC_USER=''
const OTHER_SWITCHER_CODEC_PWD=''

/*
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+     STOP  -   STOP  -   STOP  -   STOP  -   STOP  -   STOP  -   STOP      +
+ IF YOU SET SWITCHER_ROLE=SWITCHER_AUX ABOVE NO MORE CHANGES BELOW NEEDED! +
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
*/

// Video source and SpeakerTrack constants needed for defining mapping. DO NOT EDIT
const  SP=0, V1=1, V2=2, V3=3

/*
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+ SECTION 2 - SECTION 2 - SECTION 2 - SECTION 2 - SECTION 2 - SECTION 2 +
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
*/

// CAMERA / MICROPHONE ZONE PRESET OBJECTS (Z1 - Z8)
// This section is used if you have one or two PTZ cameras (either Precision 60 or PTZ 4K),
// and you want to define up to 8 microphone zones that will be serviced by Pan Tilt Zoom cameras.
// This can be in combination with one or two Quad Cameras, or without any Quad Cameras.
// The maximum number of PTZ Microphone Zones is 8. If you have one Quad Camera, it will use one of your mic inputs,
// and if you have two Quad Cameras, they will use two of your mic inputs. This leaves you with 7 or 6 zones for PTZ cameras.
// FOR EACH PTZ MICROPHONE ZONE (UP TO 8) YOU MUST DEFINE AT LEAST A PRIMARY CAMERA PRESET ID.
// If you have two PTZ cameras, you can define a primary and a secondary camera for each microphone zone.
// The reason: if Camera "A" is in use already, you will want to use Camera "B" for the next shot,
// so that the far end does not see camera motion, which could be distracting/dizzying.
// WARNING: Do not delete Z0 even if you do not intend to use camera zones, it is needed to initialize the "last camera zone used" global.
// You can define as many camera preset objects as needed up to 8, using the ZN naming convention.
// If you do not have any PTZ cameras connected to the codec, simply leave Z1 and Z2 defined as below as examples but
// do not use them in your MAP_CAMERA_SOURCES array
// NOTE: Mic inputs that trigger Quad Cameras do not use "PTZ Microphone Zones". Instead they trigger either "SP" (SpeakerTrack = local Quad Camera),
// V1, or V2 (video inputs used by Aux Codec Plus that run their own Quad Camera)
// NOTE: If you do not have a secondary preset for a zone, just use the same as the primary as the code needs that 'secondary' key present
const Z0= {'primary': 0, 'secondary': 0} //DO NOT DELETE OR COMMENT ME!!!!!
const Z1= {'primary': 11, 'secondary': 12} // These are ok to change
const Z2= {'primary': 14, 'secondary': 13} // These are ok to change
// Add camera zones below if needed to map in MAP_CAMERA_SOURCES, up to to Z8 but they can reference
// preset IDs 11-35 depending on which are configured on the codec. PresetID 30 IS RESERVED FOR USE BY THE PROGRAM
//Z3= {'primary': 5,'secondary': 6}

/*
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+ SECTION 3 - SECTION 3 - SECTION 3 - SECTION 3 - SECTION 3 - SECTION 3 +
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
*/


// Microphone Input Numbers to Monitor
// Specify the input connectors associated to the microphones being used in the room
// For example, if you set the value to [1,2,3,4,5,6,7,8] the macro will evaluate mic input id's 1-8 for its switching logic
const MICROPHONE_CONNECTORS = [1,2,3,4,5,6,7,8];

// Camera source IDs that correspond to each microphone in MICROPHONE_CONNECTORS array
// Associate the connectors to specific input source type/id corresponding to the camera that covers where the mic is located.
// For example, if you set MICROPHONE_CONNECTORS = [1,2,3,4,5,6,7,8] and MAP_CAMERA_SOURCES to [V1,V1,V1,V2,V2,V2,Z1,Z2]
// you are specifying that
// mics 1,2 and 3 located where Camera associated to video input 1 (V1) is pointing at and
// mics 4,5 and 6 are located where Camera associated to video input 2 (V2) is pointing at and
// mic 7 is associated to PTZ camera defined in the zone Z1 object above and
// mic 8 is associated to PTZ camera defined in the zone Z2 object above
// Valid values for entries in the MAP_CAMERA_SOURCES array are: SP, V1-V2 and Z1-Z8
const MAP_CAMERA_SOURCES = [V1,V1,V2,V2,V3,V3,Z1,Z2];

// Specifying which sourceID belongs to local QuadCam
// MAIN_CODEC_QUADCAM_SOURCE_ID should contain the SourceID where the QuadCam connected
// to the main codec (if any) is connected. This it typically SourceID 1. If no QuadCam is connected
// then set this to 0
const MAIN_CODEC_QUADCAM_SOURCE_ID=1;


// Mapping of video sources to CameraIDs for PTZ cameras
// MAP_PTZ_CAMERA_VIDEO_SOURCE_ID contains an object of key/value pairs that maps
// each Camera ID (key) to the video input source ID it is connected to (value).
// so, if we set it to { '1':1, '2':2, '3':6 } then it indicates that camera ID 1 is connected
// to video source 1, camera ID 2 is connected to video source 2 and camera ID 3 is connected
// to video source 6. You can define as many cameras as needed in this object or leave it with the
// sample values defined below if you are not using PTZ cameras.
// Only cameras involved in the camera zone preset objects (Z1 - Z8) need to be mapped here
const MAP_PTZ_CAMERA_VIDEO_SOURCE_ID = { '2':6, '3':2, '4':4 };

// This next line hides the mid-call controls “Lock meeting” and “Record”.  The reason for this is so that the
// “Camera Control” button can be seen.  If you prefer to have the mid-call controls showing, change the value of this from “Hidden” to “Auto”
xapi.Config.UserInterface.Features.Call.MidCallControls.set("Hidden");

/*
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+ SECTION 4 - SECTION 4 - SECTION 4 - SECTION 4 - SECTION 4 - SECTION 4 +
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
*/

// overviewShowDouble defines what is shown on the far end (the video the main codec sends into the call or conference) when in "OVERVIEW" mode where nobody is speaking or there is no
// prominent speaker detected by any of the microphones
// INSTRUCTIONS: If you are using side-by-side mode as your default - "overviewShowDouble = true" - then you must set up a camera preset for each Quad Camera
// with a Preset ID of 30.  The JavaScript for side-by-side mode uses Preset 30.
//TODO: need to cover case where overviewShowDouble is set to true for when rooms are split because they want to show a side by side even with
// PTZ cameras. Need to store away this preference and initial OVERVIEW_DOUBLE_SOURCE_IDS for when going back to split to "put it back"
var overviewShowDouble = false;

// OVERVIEW_SINGLE_SOURCE_ID specifies the source video ID to use when in overview mode if you set overviewShowDouble to false
const OVERVIEW_SINGLE_SOURCE_ID = 1;

// OVERVIEW_PRESET_ZONE specifies the PTZ camera defined zone to be used for showing an 'overview' of the room
// NOTE: OVERVIEW_PRESET_ZONE takes precedence over OVERVIEW_SINGLE_SOURCE_ID. Leave it as Z0 if you do not want to use it, otherwise
// define it like any other zone (i.e.{'primary': 1,'secondary': 2} )
// NOTE: You still need to set overviewShowDouble to false to be able to use OVERVIEW_PRESET_ZONE
const OVERVIEW_PRESET_ZONE = Z0;
//const OVERVIEW_PRESET_ZONE = {'primary': 1,'secondary': 2};

// OVERVIEW_DOUBLE_SOURCE_IDS specifies the source video array of two IDs to use when in overview mode if you set overviewShowDouble to true
// it will display the two sources side by side on the main screen with the first value of the array on the
// left and the second on the right.
var OVERVIEW_DOUBLE_SOURCE_IDS = [V1,V2];


/*
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+ SECTION 5 - SECTION 5 - SECTION 5 - SECTION 5 - SECTION 5 - SECTION 5 +
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

TIMERS and THRESHOLDS
*/


// Time to wait for silence before setting Speakertrack Side-by-Side mode
const SIDE_BY_SIDE_TIME = 10000; // 10 seconds
// Time to wait before switching to a new speaker
const NEW_SPEAKER_TIME = 2000; // 2 seconds
// Time to wait before activating automatic mode at the beginning of a call
const INITIAL_CALL_TIME = 15000; // 15 seconds
// time to wait after setting a camera preset before switching to it's source to prevent
// transmitting video during camera movement for P60 and PTZ cameras
const VIDEO_SOURCE_SWITCH_WAIT_TIME = 500; // 500 ms

/////////////////////////////////////////////////////////////////////////////////////////
// CONSTANTS/ENUMS
/////////////////////////////////////////////////////////////////////////////////////////



// Microphone High/Low Thresholds
const MICROPHONELOW  = 6;
const MICROPHONEHIGH = 25;

/*
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+ DO NOT EDIT ANYTHING BELOW THIS LINE                                  +
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
*/


/////////////////////
// MAPPING VALIDATION
/////////////////////

const sleep = (timeout) => new Promise((resolve) => {
  setTimeout(resolve, timeout);
});

async function monitorOnAutoError(message) {
  let macro = module.name.split('./')[1]
  await xapi.Command.UserInterface.Message.Alert.Display({
    Title: message.Error,
    Text: message.Message,
    Duration: 30
  })
  console.error(message)
  await xapi.Command.Macros.Macro.Deactivate({ Name: macro })
  await xapi.Command.Macros.Runtime.Restart();
}

async function validate_mappings() {
    const timeout = 2000; // Milliseconds, equals 2 seconds

    if (MICROPHONE_CONNECTORS.length != MAP_CAMERA_SOURCES.length) {
        let message = { Error: 'Switcher macro disabled', Message: 'MICROPHONE_CONNECTORS and MAP_CAMERA_SOURCES must have the same number of members. Please correct and try again.' }
        monitorOnAutoError(message);
    }

    if (MAP_CAMERA_SOURCES.indexOf(SP)!=-1) {
        if  (MAP_CAMERA_SOURCES.indexOf(SP) != MAP_CAMERA_SOURCES.lastIndexOf(SP))
        {
            let message = { Error: 'Switcher macro disabled', Message: 'There can only be one or zero SpeakerTrack (value 0) cameras sources defined in MAP_CAMERA_SOURCES. Please correct and try again.' }
            monitorOnAutoError(message);
            }
        }
}


validate_mappings();

// below we check for the existence of a SpeakerTrack camera configured for the codec
// so we can safely issue SpeakerTrack related commands
let has_SpeakerTrack= MAP_CAMERA_SOURCES.indexOf(SP) != -1 ||
                        MAP_CAMERA_SOURCES.indexOf(V1) != -1;


/////////////////////////////////////////////////////////////////////////////////////////
// VARIABLES
/////////////////////////////////////////////////////////////////////////////////////////

// initializing AUX_CODEC but will actually be set inside main_init() as needed
var AUX_CODEC_IP = '';
var AUX_CODEC={ enable: (AUX_CODEC_IP!='') , online: false};

// The JOIN_SPLIT_ROOM_ROLE const tells the macro in the particular codec it is running
// what role it should play; JS_PRIMARY or JS_SECONDARY
const JS_PRIMARY=1, JS_SECONDARY=2, JS_NONE=0


var JOIN_SPLIT_CONFIG = {
  ROOM_ROLE : JS_NONE,
  PRIMARY_VIDEO_TIELINE_INPUT_FROM_SEC_ID: 3,
  OTHER_CODEC_IP : '',
  OTHER_CODEC_USER : '',
  OTHER_CODEC_PWD : ''
}

var js_roomCombined=false;

async function read_mem_globals() {
    await GMM.memoryInit();

    JOIN_SPLIT_CONFIG=await GMM.read.global('JOIN_SPLIT_CONFIG').catch(e=>{
            //console.error(e);
            console.log("no JoinSplit config detected.")
        })
    if (JOIN_SPLIT_CONFIG.ROOM_ROLE===JS_PRIMARY) {
      js_roomCombined=await GMM.read.global('JoinSplit_combinedState').catch(e=>{
          //console.error(e);
          console.log("No JoinSplit status detected in permanente memory.")
          });
      }
}

async function validate_initial() {

  await read_mem_globals();

  //we need to  check to see if there is a join/split macro present. If such, even if OTHER_SWITCHER_CODEC_IP is
  // empty, we must create the otherSwitcherCodec object  with the otherCodec info from global permanent storage because when in
  // joined mode this macro has to act the same as if it had an AUX codec. Once in split mode, it simply wont send messages to the
  // other codec but will have the GMM connect object ready for when the room goes back to joined.
  if (JOIN_SPLIT_CONFIG.OTHER_CODEC_IP!='') {
          //here we know that there is a joinsplit macro installed and configured
          //so we have to set up the correct connection to the other codec
          //and validate the settings appropriately
          validate_joinsplit_compatible_config(JOIN_SPLIT_CONFIG.ROOM_ROLE);
          var otherSwitcherCodec = new GMM.Connect.IP(JOIN_SPLIT_CONFIG.OTHER_CODEC_USER, JOIN_SPLIT_CONFIG.OTHER_CODEC_PWD, JOIN_SPLIT_CONFIG.OTHER_CODEC_IP)
      }
      else if (OTHER_SWITCHER_CODEC_IP!='') {
          var otherSwitcherCodec = new GMM.Connect.IP(OTHER_SWITCHER_CODEC_USER, OTHER_SWITCHER_CODEC_PWD, OTHER_SWITCHER_CODEC_IP)
      }
}

validate_initial();

function validate_joinsplit_compatible_config(role) {

    if (SWITCHER_ROLE!=SWITCHER_MAIN)
    {
        let message = { Error: 'Switcher macro disabled',
        Message: 'You cannot set SWITCHER_ROLE on this codec to SWITCHER_AUX when the JoinSplit Macro is also present on the same codec. Please correct and try again.' }
        monitorOnAutoError(message);
    }

    if (OTHER_SWITCHER_CODEC_IP!='')
    {
        let message = { Error: 'Switcher macro disabled',
        Message: 'You cannot configure an AUX codec to work with when the JoinSplit Macro is also present on the same codec. Please correct and try again.' }
        monitorOnAutoError(message);
    }

    if (role==JS_PRIMARY) {
        // check that if joinsplit macro is present and in PRIMARY room,
        // video input 2 must be configured and using mic ID 8
        // when in split room mode, input 2 should never be switched to
        // because mic 8 would be turned off. Also, side by side mode is disabled
        // while in split room mode
        let valid_primary_inputs=false
        let primary_video_source_index=MAP_CAMERA_SOURCES.indexOf(JOIN_SPLIT_CONFIG.PRIMARY_VIDEO_TIELINE_INPUT_FROM_SEC_ID)
        if (primary_video_source_index>0) {
            let mic_id=MICROPHONE_CONNECTORS[primary_video_source_index]
            if (mic_id == 8 ) {
                valid_primary_inputs=true;
            }
        }
        if (!valid_primary_inputs) {
            let message = { Error: 'Switcher macro disabled',
            Message: 'When JoinSplit Macro is present and in PRIMARY room, MAP_CAMERA_SOURCES should include V2 and be mapped to mic ID 8 in MICROPHONE_CONNECTORS. Please correct and try again.' }
            monitorOnAutoError(message);
        }
    }
    else if (role==JS_SECONDARY) {
        // check for any PTZ cameras trying to use input 3 or 4, which is not allowed
        // when switcher macro is in same codec as joinsplit macro and in secondary room
        let valid_secondary_video_sources=true;
        for (const key in MAP_PTZ_CAMERA_VIDEO_SOURCE_ID) {
            if (MAP_PTZ_CAMERA_VIDEO_SOURCE_ID[key]==3 && MAP_PTZ_CAMERA_VIDEO_SOURCE_ID[key]==4) {
                valid_secondary_video_sources=false;
                }
        }
        if (!valid_secondary_video_sources) {
            let message = { Error: 'Switcher macro disabled',
            Message: 'When JoinSplit Macro is present and in SECONDARY room, MAP_PTZ_CAMERA_VIDEO_SOURCE_ID cannot contain video sources 3 or 4. Please correct and try again.' }
            monitorOnAutoError(message);
        }
    }


}

let micArrays={};
for (var i in MICROPHONE_CONNECTORS) {
    micArrays[MICROPHONE_CONNECTORS[i].toString()]=[0,0,0,0];
}
let lowWasRecalled = false;
let lastActiveHighInput = 0;
let allowSideBySide = true;
let sideBySideTimer = null;
let InitialCallTimer = null;
let allowCameraSwitching = false;
let allowNewSpeaker = true;
let newSpeakerTimer = null;
let manual_mode = true;
let lastActivePTZCameraZoneObj=Z0;
let lastActivePTZCameraZoneCamera='0';

let micHandler= () => void 0;

/////////////////////////////////////////////////////////////////////////////////////////
// UTILITIES
/////////////////////////////////////////////////////////////////////////////////////////

async function getPresetCamera(prID) {
  const value =  await xapi.Command.Camera.Preset.Show({ PresetId: prID });
  return(value.CameraId)
}

/////////////////////////////////////////////////////////////////////////////////////////
// INITIALIZATION
/////////////////////////////////////////////////////////////////////////////////////////



function evalFullScreen(value) {
	if (value=='On') {
		xapi.command('UserInterface Extensions Widget SetValue', {WidgetId: 'widget_FS_selfview', Value: 'on'});
	}
	else
	{
		xapi.command('UserInterface Extensions Widget SetValue', {WidgetId: 'widget_FS_selfview' , Value: 'off'});
	}
}

// evalFullScreenEvent is needed because we have to check when someone manually turns on full screen
// when self view is already selected... it will eventually check FullScreen again, but that should be
// harmless
function evalFullScreenEvent(value)
{
  if (SWITCHER_ROLE===SWITCHER_MAIN) {
    if (value=='On') {
      xapi.Status.Video.Selfview.Mode.get().then(evalSelfView);
    }
    else
    {
      xapi.command('UserInterface Extensions Widget SetValue', {WidgetId: 'widget_FS_selfview', Value: 'off'});
    }
 }
}

function evalSelfView(value) {
  if (SWITCHER_ROLE===SWITCHER_MAIN) {
    if (value=='On') {
      xapi.Status.Video.Selfview.FullscreenMode.get().then(evalFullScreen);
    }
    else
    {
      xapi.command('UserInterface Extensions Widget SetValue', {WidgetId: 'widget_FS_selfview', Value: 'off'});
    }
  }
}

function main_init() {
  console.log('main_init');
  // configure HTTP settings
  xapi.config.set('HttpClient Mode', 'On').catch(handleError);
  xapi.config.set('HttpClient AllowInsecureHTTPS:', 'True').catch(handleError);
  xapi.config.set('HttpClient AllowHTTP:', 'True').catch(handleError);

    // IP Address of AUX codec (i.e. CodecPlus)
    // NOTE: if there is no auxiliary codec, you must set the value of OTHER_SWITCHER_CODEC_IP to ''
    //TODO: if there is a joinsplit in the codec AND we are in joined mode, then we must pick up otherCodec from global storage and
    // force that to be the AUX codec even if locally we ad not configured OTHER_SWITCHER_CODEC_IP
    AUX_CODEC_IP = OTHER_SWITCHER_CODEC_IP;
    AUX_CODEC={ enable: (AUX_CODEC_IP!='') , online: false};

  // add custom control panel for turning onn/off automatic mode
  xapi.Command.UserInterface.Extensions.Panel.Save({ PanelId: 'panel_manual_override' },
        `<Extensions>
          <Version>1.8</Version>
          <Panel>
            <Order>1</Order>
            <PanelId>panel_manual_override</PanelId>
            <Origin>local</Origin>
            <Type>Statusbar</Type>
            <Icon>Camera</Icon>
            <Color>#07C1E4</Color>
            <Name>Camera Control</Name>
            <ActivityType>Custom</ActivityType>
            <Page>
              <Name>Camera Control</Name>
              <Row>
                <Name/>
                <Widget>
                  <WidgetId>widget_9</WidgetId>
                  <Name>Select manual or automatic control of Quad Cameras</Name>
                  <Type>Text</Type>
                  <Options>size=4;fontSize=normal;align=center</Options>
                </Widget>
              </Row>
              <Row>
                <Name/>
                <Widget>
                  <WidgetId>widget_8</WidgetId>
                  <Name>Manual</Name>
                  <Type>Text</Type>
                  <Options>size=1;fontSize=normal;align=center</Options>
                </Widget>
                <Widget>
                  <WidgetId>widget_override</WidgetId>
                  <Type>ToggleButton</Type>
                  <Options>size=1</Options>
                </Widget>
                <Widget>
                  <WidgetId>widget_6</WidgetId>
                  <Name>Automatic</Name>
                  <Type>Text</Type>
                  <Options>size=2;fontSize=normal;align=center</Options>
                </Widget>
              </Row>
              <Row>
                <Name/>
                <Widget>
                  <WidgetId>widget_10</WidgetId>
                  <Name>For testing while not in call, turn on fullscreen Selfview</Name>
                  <Type>Text</Type>
                  <Options>size=4;fontSize=normal;align=center</Options>
                </Widget>
              </Row>
              <Row>
                <Name/>
                <Widget>
                  <WidgetId>widget_14</WidgetId>
                  <Name>Off</Name>
                  <Type>Text</Type>
                  <Options>size=1;fontSize=normal;align=center</Options>
                </Widget>
                <Widget>
                  <WidgetId>widget_FS_selfview</WidgetId>
                  <Type>ToggleButton</Type>
                  <Options>size=1</Options>
                </Widget>
                <Widget>
                  <WidgetId>widget_12</WidgetId>
                  <Name>Selfview</Name>
                  <Type>Text</Type>
                  <Options>size=2;fontSize=normal;align=center</Options>
                </Widget>
              </Row>
              <PageId>panel_manual_override</PageId>
              <Options/>
            </Page>
          </Panel>
        </Extensions>
        `);

  // Stop any VuMeters that might have been left from a previous macro run with a different MICROPHONE_CONNECTORS constant
  // to prevent errors due to unhandled vuMeter events.
  xapi.Command.Audio.VuMeter.StopAll({ });

  //  set self-view toggle on custom panel depending on Codec status that might have been set manually
  xapi.Status.Video.Selfview.Mode.get().then(evalSelfView);

  // next, set Automatic mode toggle switch on custom panel off since the macro starts that way
  xapi.command('UserInterface Extensions Widget SetValue', {WidgetId: 'widget_override', Value: 'off'});
  //TODO: based on GMM variables, if set for JoinSplit and in Join (Combine) mode, trigger the right setup for that! 
}

function aux_init() {
  console.log('init');
    //Remove custom panel for turning on and off automation in case this is being used in a codec that
    // is also runnig the joinsplit macro.
    xapi.Command.UserInterface.Extensions.Panel.Remove({ PanelId: 'panel_manual_override' });

/////////////////////////////////////////////////////////////////////////////////////////
// STARTUP SCRIPT
// The following sections constitute a startup script that the codec will run whenever it
// boots.
/////////////////////////////////////////////////////////////////////////////////////////

    xapi.config.set('Video Monitors', 'Single');
    xapi.config.set('Video Output Connector 1 MonitorRole', 'First');
    xapi.config.set('Standby Halfwake Mode', 'Manual').catch((error) => {
          console.log('Your software version does not support this configuration.  Please install ‘Custom Wallpaper’ on the codec in order to prevent Halfwake mode from occurring.');
          console.error(error);
      });

    xapi.config.set('Standby Control', 'Off');
    xapi.command('Video Selfview Set', {Mode: 'On', FullScreenMode: 'On', OnMonitorRole: 'First'})
        .catch((error) => { console.error(error); });

  // configure HTTP settings
  xapi.config.set('HttpClient Mode', 'On').catch(handleError);
  xapi.config.set('HttpClient AllowInsecureHTTPS:', 'True').catch(handleError);
  xapi.config.set('HttpClient AllowHTTP:', 'True').catch(handleError);


}

/////////////////////////////////////////////////////////////////////////////////////////
// START/STOP AUTOMATION FUNCTIONS
/////////////////////////////////////////////////////////////////////////////////////////

function startAutomation() {
  console.log('startAutomation');
   //setting overall manual mode to false
   manual_mode = false;
   allowCameraSwitching = true;


    // Always turn on SpeakerTrack when the Automation is started. It is also turned on when a call connects so that
    // if it is manually turned off while outside of a call it goes back to the correct state
   if (has_SpeakerTrack) xapi.command('Cameras SpeakerTrack Activate').catch(handleError);

   //registering vuMeter event handler
   micHandler=xapi.event.on('Audio Input Connectors Microphone', (event) => {
        micArrays[event.id[0]].pop();
        micArrays[event.id[0]].push(event.VuMeter);

        // checking on manual_mode might be unnecessary because in manual mode,
        // audio events should not be triggered
        if (manual_mode==false)
        {
            // invoke main logic to check mic levels ans switch to correct camera input
            checkMicLevelsToSwitchCamera();
        }
    });
  // start VuMeter monitoring
  console.log("Turning on VuMeter monitoring...")
  for (var i in MICROPHONE_CONNECTORS) {
    xapi.command('Audio VuMeter Start', {
          ConnectorId: MICROPHONE_CONNECTORS[i],
          ConnectorType: 'Microphone',
          IntervalMs: 500,
          Source: 'AfterAEC'
    });
  }
  // set toggle button on custom panel to reflect that automation is turned on.
  xapi.command('UserInterface Extensions Widget SetValue', {WidgetId: 'widget_override', Value: 'on'});
}

function stopAutomation() {
         //setting overall manual mode to true
         manual_mode = true;
         console.log("Stopping all VuMeters...");
         xapi.Command.Audio.VuMeter.StopAll({ });
         //TODO: check to see if when we stop automation we really want to switch to connectorID 1
         console.log("Switching to MainVideoSource connectorID 1 ...");
         xapi.Command.Video.Input.SetMainVideoSource({ SourceId: 1});
         // using proper way to de-register handlers
         micHandler();
         micHandler= () => void 0;

         // set toggle button on custom panel to reflect that automation is turned off.
         xapi.command('UserInterface Extensions Widget SetValue', {WidgetId: 'widget_override', Value: 'off'});

}

/////////////////////////////////////////////////////////////////////////////////////////
// MICROPHONE DETECTION AND CAMERA SWITCHING LOGIC FUNCTIONS
/////////////////////////////////////////////////////////////////////////////////////////

function checkMicLevelsToSwitchCamera() {
  // make sure we've gotten enough samples from each mic in order to do averages
  if (allowCameraSwitching) {
         // figure out which of the inputs has the highest average level then perform logic for that input *ONLY* if allowCameraSwitching is true
          let array_key=largestMicValue();
          let array=[];
          array=micArrays[array_key];
          // get the average level for the currently active input
          let average = averageArray(array);
          //get the input number as an int since it is passed as a string (since it is a key to a dict)
          let input = parseInt(array_key);
          // someone is speaking
          if (average > MICROPHONEHIGH) {
            // start timer to prevent Side-by-Side mode too quickly
            restartSideBySideTimer();
            if (input > 0) {
              lowWasRecalled = false;
              // no one was talking before
              if (lastActiveHighInput === 0) {
                makeCameraSwitch(input, average);
              }
              // the same person is talking
              else if (lastActiveHighInput === input) {
                restartNewSpeakerTimer();
              }
              // a different person is talking
              else if (lastActiveHighInput !== input) {
                if (allowNewSpeaker) {
                  makeCameraSwitch(input, average);
                }
              }
            }
          }
          // no one is speaking
          else if (average < MICROPHONELOW) {
            // only trigger if enough time has elapsed since someone spoke last
            if (allowSideBySide) {
              if (input > 0 && !lowWasRecalled) {
                lastActiveHighInput = 0;
                lowWasRecalled = true;
                console.log("-------------------------------------------------");
                console.log("Low Triggered");
                console.log("-------------------------------------------------");
                recallSideBySideMode();
              }
            }
          }

  }
}

// function to actually switch the camera input
async function makeCameraSwitch(input, average) {
  console.log("-------------------------------------------------");
  console.log("High Triggered: ");
  console.log(`Input = ${input} | Average = ${average}`);
  console.log("-------------------------------------------------");

  // first obtain the Map Camera Sources value that corresponds to the loudest microphone
  // we want to use for switching camera input
  var selectedSource=MAP_CAMERA_SOURCES[MICROPHONE_CONNECTORS.indexOf(input)]

// We do not need to check for  has_SpeakerTrack below because we are implicitly
// checking for that by evaluating typeof selectedSource
  if (typeof selectedSource == 'number') {
    if (selectedSource==SP) {
        // if the active camera is a SpeakerTrack camera, just activate it, no need to set main video source to it
        console.log('Switching to SpeakerTrack camera');
        xapi.command('Cameras SpeakerTrack Activate').catch(handleError);
    }
    else {
          // the Video Input SetMainVideoSource does not work while Speakertrack is active
          // so we need to turn it off in case the previous video input was from a source where
          // SpeakerTrack is used.
          xapi.command('Cameras SpeakerTrack Deactivate').catch(handleError);
           // Switch to the source that is speficied in the same index position in MAP_CAMERA_SOURCE_IDS
          let sourceDict={ SourceID : '0'}
          sourceDict["SourceID"]=selectedSource.toString();
          console.log("Switching to input with SetMainVideoSource with dict: ", sourceDict  )
          xapi.command('Video Input SetMainVideoSource', sourceDict).catch(handleError);
          if ((MAP_CAMERA_SOURCES.indexOf(SP)==-1) && (selectedSource==MAIN_CODEC_QUADCAM_SOURCE_ID) ) {
              // if the codec is using a QuadCam (no SpeakerTrack camera allowed) then
              // turn back on SpeakerTrack function on the codec in case it was turned off in side by side mode.
              xapi.command('Cameras SpeakerTrack Activate').catch(handleError);
          }
      }
      // if we are not switching to a camera zone with PTZ cameras, we need to re-set the
      // lastActivePTZCameraZone Object to the "non-camera" value of Z0 as when we started the macro
      // because the decision tree on switching or not from a camera that was already pointed at someone
      // relies on the last video input source having been a PTZ camera video zone
      lastActivePTZCameraZoneObj=Z0;
      lastActivePTZCameraZoneCamera='0';
    }
   else if (typeof selectedSource == 'object') {
        switchToVideoZone(selectedSource);
   }


  // send required messages to auxiliary codec that also turns on speakertrack over there
  sendIntercodecMessage(AUX_CODEC, 'automatic_mode');
  lastActiveHighInput = input;
  restartNewSpeakerTimer();
}

async function switchToVideoZone(selectedSource) {
           // The mic input mapped to a PTZ camera is to be selected, first check that camera zone was already being used
            if (lastActivePTZCameraZoneObj==selectedSource) {
                // same camera zone as before, so we do not want to change the inUse value of that zone object (keep it inUse=true)
                console.log("Still using same camera zone, no need to Activate camera preset.")
            }
            else
            {
                var selectedSourcePrimaryCamID='';
                var selectedSourceSecondaryCamID='';
                var thePresetId=0;
                var thePresetVideoSource=0;
                // Since this is a camera zone,  first check if primary or secondary to be selected based on the possibility
                // that the previous zone was using the same physical camera than the new zone selected.
                selectedSourcePrimaryCamID = await getPresetCamera(selectedSource['primary']);
                if (selectedSourcePrimaryCamID!=lastActivePTZCameraZoneCamera) {
                    thePresetId=selectedSource['primary'];
                    thePresetVideoSource=MAP_PTZ_CAMERA_VIDEO_SOURCE_ID[selectedSourcePrimaryCamID]
                    lastActivePTZCameraZoneObj=selectedSource;
                    lastActivePTZCameraZoneCamera=selectedSourcePrimaryCamID;
                }
                else {
                    selectedSourceSecondaryCamID = await getPresetCamera(selectedSource['secondary']);
                    thePresetId=selectedSource['secondary'];
                    thePresetVideoSource=MAP_PTZ_CAMERA_VIDEO_SOURCE_ID[selectedSourceSecondaryCamID]
                    lastActivePTZCameraZoneObj=selectedSource;
                    lastActivePTZCameraZoneCamera=selectedSourceSecondaryCamID;

                }
                // instruct the codec to now use the correct camera preset
                console.log('Switching to preset ID: '+thePresetId+' which uses camera: '+lastActivePTZCameraZoneCamera);
                xapi.Command.Camera.Preset.Activate({ PresetId: thePresetId });

                // now set main video source to where the camera is connected
                setTimeout(function() {
                            setMainVideoSource(thePresetVideoSource);
                            }, VIDEO_SOURCE_SWITCH_WAIT_TIME);

            }

}

function setMainVideoSource(thePresetVideoSource) {
    // the Video Input SetMainVideoSource does not work while Speakertrack is active
    // so we need to turn it off in case the previous video input was from a source where
    // SpeakerTrack is used.
    if (has_SpeakerTrack) xapi.command('Cameras SpeakerTrack Deactivate').catch(handleError);

    let sourceDict={ SourceID : '0'}
    sourceDict["SourceID"]=thePresetVideoSource.toString();
    console.log("In setMainVideoSource() switching to input with SetMainVideoSource with dict: ", sourceDict  )
    xapi.command('Video Input SetMainVideoSource', sourceDict).catch(handleError);
}

function largestMicValue() {
  // figure out which of the inputs has the highest average level and return the corresponding key
 let currentMaxValue=0;
 let currentMaxKey='';
 let theAverage=0;
 for (var i in MICROPHONE_CONNECTORS){
    theAverage=averageArray(micArrays[MICROPHONE_CONNECTORS[i].toString()]);
    if (theAverage>=currentMaxValue) {
        currentMaxKey=MICROPHONE_CONNECTORS[i].toString();
        currentMaxValue=theAverage;
    }
 }
 return currentMaxKey;
}

function averageArray(arrayIn) {
  let sum = 0;
  for(var i = 0; i < arrayIn.length; i++) {
    sum = sum + parseInt( arrayIn[i], 10 );
  }
  let avg = (sum / arrayIn.length) * arrayIn.length;
  return avg;
}

async function recallSideBySideMode() {
  //first we need to clear out the lastActivePTZCameraZone vars since we want to make sure
  // that after SideBySideMode is called, the next call to switchToVideoZone() does actually force
  // a switch
  lastActivePTZCameraZoneObj=Z0;
  lastActivePTZCameraZoneCamera='0';
  if (overviewShowDouble) {
        let connectorDict={ ConnectorId : [0,0]};
        connectorDict["ConnectorId"]=OVERVIEW_DOUBLE_SOURCE_IDS;
        console.log("Trying to use this for connector dict in recallSideBySideMode(): ", connectorDict  )
        xapi.command('Video Input SetMainVideoSource', connectorDict).catch(handleError);
        if (has_SpeakerTrack) xapi.command('Cameras SpeakerTrack Deactivate').catch(handleError);
        xapi.command('Camera Preset Activate', { PresetId: 30 }).catch(handleError);
    }
    else {
        // Check for OVERVIEW_PRESET_ZONE. If set to default Z0, just SetMainVideoSource
        if (OVERVIEW_PRESET_ZONE == Z0) {
            let sourceDict={ SourceID : '0'};
            sourceDict["SourceID"]=OVERVIEW_SINGLE_SOURCE_ID.toString();
            console.log("Trying to use this for source dict in recallSideBySideMode(): ", sourceDict  )
            xapi.command('Video Input SetMainVideoSource', sourceDict).catch(handleError);
            if (has_SpeakerTrack) xapi.command('Cameras SpeakerTrack Deactivate').catch(handleError);
        }
        else {
                // If OVERVIEW_PRESET_ZONE is defined as something other than Z0, switch to that
                console.log('Recall side by side mode switching to preset OVERVIEW_PRESET_ZONE...');
                if (has_SpeakerTrack) xapi.command('Cameras SpeakerTrack Deactivate').catch(handleError);
                switchToVideoZone(OVERVIEW_PRESET_ZONE);
        }
    }
  // send required messages to other codecs
  sendIntercodecMessage(AUX_CODEC, 'side_by_side');
  lastActiveHighInput = 0;
  lowWasRecalled = true;
}


/////////////////////////////////////////////////////////////////////////////////////////
// TOUCH 10 UI FUNCTION HANDLERS
/////////////////////////////////////////////////////////////////////////////////////////

function handleOverrideWidget(event)
{
  if (SWITCHER_ROLE===SWITCHER_MAIN) {
         if (event.WidgetId === 'widget_override')
         {
            console.log("Camera Control button selected.....")
            if (event.Value === 'off') {

                    console.log("Camera Control is set to Manual...");
                    console.log("Stopping automation...")
                    stopAutomation();
                }
               else
               {

                  // start VuMeter monitoring
                  console.log("Camera Control is set to Automatic...");
                  console.log("Starting automation...")
                  startAutomation();
               }
         }


         if (event.WidgetId === 'widget_FS_selfview')
         {
            console.log("Selfview button selected.....")
            if (event.Value === 'off') {
                    console.log("Selfview is set to Off...");
                    console.log("turning off self-view...")
                    xapi.Command.Video.Selfview.Set({ FullscreenMode: 'Off', Mode: 'Off', OnMonitorRole: 'First'});
                }
               else
               {
                  console.log("Selfview is set to On...");
                  console.log("turning on self-view...")
                  // TODO: determine if turning off self-view should also turn off fullscreenmode
                  xapi.Command.Video.Selfview.Set({ FullscreenMode: 'On', Mode: 'On', OnMonitorRole: 'First'});
               }
         }
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
// ERROR HANDLING
/////////////////////////////////////////////////////////////////////////////////////////

function handleError(error) {
  console.log(error);
}

/////////////////////////////////////////////////////////////////////////////////////////
// INTER-MACRO MESSAGE HANDLING
/////////////////////////////////////////////////////////////////////////////////////////
GMM.Event.Receiver.on(event => {

    if (event.Source.Id=='localhost') {
          switch (event.App) { //Based on the App (Macro Name), I'll run some code
            case 'JoinSplit':
              if (event.Type == 'Error') {
                console.error(event)
              } else {
                switch (event.Value.Action) {
                  case 'ROOMS_SPLIT':
                    console.warn(`Room switching to split mode`)
                    AUX_CODEC_IP=''
                    AUX_CODEC={ enable: false , online: false};
                    if (JOIN_SPLIT_CONFIG.ROOM_ROLE==JS_PRIMARY) {
                        overviewShowDouble=false;
                        OVERVIEW_DOUBLE_SOURCE_IDS = [1,1]; // should not be needed, but useful if someone overviewdouble is enabled somehow
                    }
                    else if (JOIN_SPLIT_CONFIG.ROOM_ROLE==JS_SECONDARY) {
                      js_roomCombined=false; //need to set this here because in secondary we do not use permanent memory for this status
                        main_init(); // main_init() also stops all vuMeters after we turned it on when joined in secondary room
                    }
                    break;
                  case 'ROOMS_JOINED':
                    console.warn(`Room switching to joined mode`)
                    AUX_CODEC_IP=JOIN_SPLIT_CONFIG.OTHER_CODEC_IP
                    AUX_CODEC={ enable: (AUX_CODEC_IP!='') , online: false};
                    if (JOIN_SPLIT_CONFIG.ROOM_ROLE==JS_PRIMARY) {
                        overviewShowDouble=true;
                        OVERVIEW_DOUBLE_SOURCE_IDS = [V1,JOIN_SPLIT_CONFIG.PRIMARY_VIDEO_TIELINE_INPUT_FROM_SEC_ID];
                        main_init(); 
                    }
                    else if (JOIN_SPLIT_CONFIG.ROOM_ROLE==JS_SECONDARY) {
                        // we first need to stop switching if it was enabled
                        js_roomCombined=true; //need to set this here because in secondary we do not use permanent memory for this status
                        stopAutomation();
                        // then we need to turn on vuMeters just to make sure the mute LEDs show
                          // start VuMeter monitoring
                        console.log("Turning on VuMeter monitoring...")
                        for (var i in MICROPHONE_CONNECTORS) {
                          xapi.command('Audio VuMeter Start', {
                                ConnectorId: MICROPHONE_CONNECTORS[i],
                                ConnectorType: 'Microphone',
                                IntervalMs: 500,
                                Source: 'AfterAEC'
                          }); 
                        }
                        //aux_init(); //if we call this, it will mess up setup that JoinSplit did for secondary
                    }
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
          }
          else
          {
                switch (event.App) { //Based on the App (Macro Name), I'll run some code
                case 'voice_activated_switching':
                  if (event.Type == 'Error') {
                    console.error(event)
                  } else {
                    switch (event.Value) {
                      case 'VTC-1_OK':
                        handleCodecOnline(AUX_CODEC);
                        break;
                      case "VTC-1_status":
                        aux_handleMacroStatus();
                        break;
                      case 'wake_up':
                        aux_handleWakeUp();
                        break;
                      case 'shut_down':
                        aux_handleShutDown();
                        break;
                      case 'side_by_side':
                        aux_handleSideBySide();
                        break;
                      case 'automatic_mode':
                        aux_handleAutomaticMode();
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

          }
        })


/////////////////////////////////////////////////////////////////////////////////////////
// INTER-CODEC COMMUNICATION
/////////////////////////////////////////////////////////////////////////////////////////

function sendIntercodecMessage(codec, message) {
  if (codec.enable) {

    otherSwitcherCodec.status(message).post().catch(e=>{
      console.log('Error sending message');
      //TODO: add error handler to call alertFailedIntercodecComm() if sending the message failed
      // need to call alertFailedIntercodecComm(errMessage1);
    });


  };
}

function aux_sendIntercodecMessage(message) {
   otherSwitcherCodec.status(message).post();
}

function alertFailedIntercodecComm(message) {
        xapi.command("UserInterface Message Alert Display", {
        Text: message
      , Duration: 10
    }).catch((error) => { console.error(error); });
}

/////////////////////////////////////////////////////////////////////////////////////////
// OTHER FUNCTIONAL HANDLERS
/////////////////////////////////////////////////////////////////////////////////////////


function handleMicMuteOn() {
  console.log('handleMicMuteOn');
  lastActiveHighInput = 0;
  lowWasRecalled = true;
  recallSideBySideMode();
}

function handleMicMuteOff() {
  console.log('handleMicMuteOff');
  // need to turn back on SpeakerTrack that might have been turned off when going on mute
  if (has_SpeakerTrack) xapi.command('Cameras SpeakerTrack Activate').catch(handleError);
}

// ---------------------- MACROS


// function to check the satus of the macros running on the AUX codec
function handleMacroStatus() {
  console.log('handleMacroStatus');
  if (AUX_CODEC.enable) {
      // reset tracker of responses from AUX codec
      AUX_CODEC.online = false;
      // send required messages to AUX codec
      sendIntercodecMessage(AUX_CODEC, 'VTC-1_status');
  }
}

function handleCodecOnline(codec) {
    if (codec.enable) {
      console.log(`handleCodecOnline: codec = ${codec.url}`);
      codec.online = true;
  }
}

function handleWakeUp() {
  console.log('handleWakeUp');
  // stop automatic switching behavior
  stopAutomation();
  // send wakeup to AUX codec
  sendIntercodecMessage(AUX_CODEC, 'wake_up');
  // check the satus of the macros running on the AUX codec and store it in AUX_CODEC.online
  // in case we need to check it in some other function
  handleMacroStatus();
}

function handleShutDown() {
  console.log('handleShutDown');
  // send required messages to other codecs
  sendIntercodecMessage(AUX_CODEC, 'shut_down');
}

function aux_handleMacroStatus() {
  console.log('handleMacroStatus');
  aux_sendIntercodecMessage('VTC-1_OK');
}

function aux_handleWakeUp() {
  console.log('handleWakeUp');

  // send required commands to this codec
  xapi.command('Standby Deactivate').catch(handleError);
}

function aux_handleShutDown() {
  console.log('handleShutDown');

  // send required commands to this codec
  xapi.command('Standby Activate').catch(handleError);
}

function aux_handleSideBySide() {
  console.log('handleSideBySide');

  // send required commands to this codec
  xapi.command('Cameras SpeakerTrack Deactivate').catch(handleError);
  xapi.command('Camera Preset Activate', { PresetId: 30 }).catch(handleError);
}

function aux_handleAutomaticMode() {
  console.log('handleAutomaticMode');

  // send required commands to this codec
  xapi.command('Cameras SpeakerTrack Activate').catch(handleError);
}

/////////////////////////////////////////////////////////////////////////////////////////
// VARIOUS TIMER HANDLER FUNCTIONS
/////////////////////////////////////////////////////////////////////////////////////////

function startSideBySideTimer() {
  if (sideBySideTimer == null) {
    allowSideBySide = false;
    sideBySideTimer = setTimeout(onSideBySideTimerExpired, SIDE_BY_SIDE_TIME);
  }
}

function stopSideBySideTimer() {
  if (sideBySideTimer != null) {
    clearTimeout(sideBySideTimer);
    sideBySideTimer = null;
  }
}

function restartSideBySideTimer() {
  stopSideBySideTimer();
  startSideBySideTimer();
}

function onSideBySideTimerExpired() {
  console.log('onSideBySideTimerExpired');
  allowSideBySide = true;
  recallSideBySideMode();
}



function startInitialCallTimer() {
  if (InitialCallTimer == null) {
    allowCameraSwitching = false;
    InitialCallTimer = setTimeout(onInitialCallTimerExpired, INITIAL_CALL_TIME);
  }
}

function onInitialCallTimerExpired() {
  console.log('onInitialCallTimerExpired');
  allowCameraSwitching = true;
  if (has_SpeakerTrack) xapi.command('Cameras SpeakerTrack Activate').catch(handleError);

}

function startNewSpeakerTimer() {
  if (newSpeakerTimer == null) {
    allowNewSpeaker = false;
    newSpeakerTimer = setTimeout(onNewSpeakerTimerExpired, NEW_SPEAKER_TIME);
  }
}

function stopNewSpeakerTimer() {
  if (newSpeakerTimer != null) {
    clearTimeout(newSpeakerTimer);
    newSpeakerTimer = null;
  }
}

function restartNewSpeakerTimer() {
  stopNewSpeakerTimer();
  startNewSpeakerTimer();
}

function onNewSpeakerTimerExpired() {
  allowNewSpeaker = true;
}

/////////////////////////////////////////////////////////////////////////////////////////
// INVOCATION OF INIT() TO START THE MACRO
/////////////////////////////////////////////////////////////////////////////////////////

// if the Speakertrack Camera becomes available after FW upgrade, we must re-init so
// we register that action as an event handler
xapi.Status.Cameras.SpeakerTrack.Availability
    .on((value) => {
        console.log("Event received for SpeakerTrack Availability: ",value)
        if (value=="Available"){
          init();
        }
    });


function init() {
  
    // register callback for processing manual mute setting on codec
    xapi.Status.Audio.Microphones.Mute.on((state) => {
      if (SWITCHER_ROLE===SWITCHER_MAIN) {
        console.log(`handleMicMuteResponse: ${state}`);
        if (!js_roomCombined) {
          if (state == 'On') {
              stopSideBySideTimer();
              setTimeout(handleMicMuteOn, 2000);
          }
          else if (state == 'Off') {
                handleMicMuteOff();
          }
      }
    }
  });

  // register event handlers for local events
  xapi.Status.Standby.State.on(value => {
    if (SWITCHER_ROLE===SWITCHER_MAIN) {
          console.log(value);
          if (!js_roomCombined) {
            if (value=="Off") handleWakeUp();
            if (value=="Standby") handleShutDown();
          }
    }
  });

    // register handler for Widget actions
    xapi.event.on('UserInterface Extensions Widget Action', (event) =>
                            handleOverrideWidget(event));

    // register handler for Call Successful
    xapi.Event.CallSuccessful.on(async () => {
      if (SWITCHER_ROLE===SWITCHER_MAIN) {
        console.log("Starting new call timer...");
        startAutomation();
        startInitialCallTimer();
      }
    });

    // register handler for Call Disconnect
    xapi.Event.CallDisconnect.on(async () => {
      if (SWITCHER_ROLE===SWITCHER_MAIN) {
        console.log("Turning off Self View....");
        xapi.Command.Video.Selfview.Set({ Mode: 'off'});
        stopAutomation();
      }
    });

    // register to receive events when someone manually turns on self-view
    // so we can keep the custom toggle button in the right state
    xapi.Status.Video.Selfview.Mode.on(evalSelfView);

    // register to receive events when someone manually turns on full screen mode
    // so we can keep the custom toggle button in the right state if also in self view
    xapi.Status.Video.Selfview.FullscreenMode.on(evalFullScreenEvent);
    
    // first check to see if the room is supposed to be in combined mode as per permanent storage
    if (js_roomCombined){
      console.warn(`Room is configured in joined mode upon init, setting properly....`)
      AUX_CODEC_IP=JOIN_SPLIT_CONFIG.OTHER_CODEC_IP
      AUX_CODEC={ enable: (AUX_CODEC_IP!='') , online: false};
      if (JOIN_SPLIT_CONFIG.ROOM_ROLE==JS_PRIMARY) {
          overviewShowDouble=true;
          OVERVIEW_DOUBLE_SOURCE_IDS = [V1,JOIN_SPLIT_CONFIG.PRIMARY_VIDEO_TIELINE_INPUT_FROM_SEC_ID];
          main_init(); 
      }
      else if (JOIN_SPLIT_CONFIG.ROOM_ROLE==JS_SECONDARY) {
          // stop automation in case it was on
          stopAutomation();
      }
    }
    else {
    // not in combined mode or not using JoinSplit macro, just check for switcher role and init accordingly
    if (SWITCHER_ROLE===SWITCHER_MAIN) {
          main_init();
      }
      else {
        aux_init();
      }
    }
}

init();
