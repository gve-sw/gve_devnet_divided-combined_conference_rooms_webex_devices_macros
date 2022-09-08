# GVE DevNet Divided-Combined Conference Rooms Webex Devices Macros
Macros to automate dividing and combining conference rooms with Webex devices so that the same equipment can be used in both modes to join conference calls  


## Contacts  
* Gerardo Chaves (gchaves@cisco.com)
* Enrico Conedera (econeder@cisco.com)
  
## Solution Components  
* Webex Collaboration Endpoints  
* Javascript  
* xAPI  
  


## Installation/Configuration  

Follow the [Version 2.2.1 Two-way System Drawing](./Version_2_2_1_Two-way_System_Drawing.pdf) diagrams for hardware setup.  

For configuration setup and further hardware setup instructions, refer to the [Installation Instructions for Divisible Conference Rooms Version 2.2](./Installation_Instructions_for_Divisible_Conference_Rooms_Version_2_2.pdf) document in this repository.  

Install GMM_Lib.js, JoinSplit.js and VoiceSwitch.js on each codec (primary and secondary)  

If you also have installed the USB Mode Version 3 macro, you need to edit it and set the `matrix_Camera_Mode` constant to `true`  

NOTE: The macro modules contained in this repository and the USB Mode Macro Version 3 use the same macro library contained in GMM_Lib.js , if 
you already installed it for the USB Mode Macro, there is no need to install it again.  

Here is a summary of their roles as modules of this Divided-Combined functionality: 

### GMM_Lib.js  

This is a library shared by various Webex Device macros that simplifies communication between codecs and modules on the same codec.  
More details at: https://github.com/CiscoDevNet/roomdevices-macros-samples/tree/master/Global%20Macro%20Messaging  


### JoinSplit.js  

This is the standalone versions of the join/split macro module meant to work together with the Switcher and future Ducker 
and USBMode modules via events on the same codec and across codecs with the GMM library.  
Communications needed between Primary and Secondary codecs to keep the codec awake and set the correct 
video layouts is delegated to the VoiceSwitch macros that should be installed and configured on the corresponding rooms  
IMPORTANT: Turn on the JoinSplit macro on the Primary codec before turning it on in Secondary to give the macro a chance 
to set PIN 4 to the correct Join/Split state according to what is stored in permanent storage.  

Once you have installed JoinSplit.js in both the Primary and Secondary codecs, edit as needed the constants in  
sections 1, 2 and 3 of that file before turning on the macro.  


### VoiceSwitch.js  

This switcher module of the Divided-Combined Conference Room macro is based on the Executive Room Voice Activated Switching macro published at: https://github.com/gve-sw/gve_devnet_webex_devices_executive_room_voice_activated_switching_macro  
It will eventually be the standalone version of the Executive Room Voice Activated Switching macro  
In the context of the Divided-Combined Conference Room macro, it needs to be configured as needed 
for when the rooms are SEPARATE or SPLIT following the restrictions imposed by the Join-Split room design.  
The macro will change the switching behavior of both the primary and secondary rooms when in combined 
mode and switch back to what you configure here when the rooms are split again.  
IMPORTANT: Turn on the JoinSplit and VoiceSwitch macros on the Primary codec before turning them on 
in the secondary since permanent memory storage in the Primary contains the correct combined or split 
state of the rooms in case the devices reset or power cycle and need to revert to that persistent state.  

Once you have installed VoiceSwitch.js in both the Primary and Secondary codecs, edit as needed the constants in  
sections 1, 2, 3, 4 and 5 of that file before turning on the macro.  


IMPORTANT: Turn on only the JoinSplit and VoiceSwitch macros on each codec starting with those on the Primary and then on the Secondary codec.  DO NOT turn on the GMM_Lib macro, it is just a library included by the other two.   

## Usage  

The macros are running and have done the initial configuration, you can switch room configurations from joined/combined to split/standalone by either triggering the wall switch with the divider wall between them or manually on the Touch10 or Navigator associated to the Primary codec as per configuration of the USE_WALL_SENSOR constant in JoinSplit.js of the Primary codec.  

# Screenshots

 

### LICENSE

Provided under Cisco Sample Code License, for details see [LICENSE](LICENSE.md)

### CODE_OF_CONDUCT

Our code of conduct is available [here](CODE_OF_CONDUCT.md)

### CONTRIBUTING

See our contributing guidelines [here](CONTRIBUTING.md)

#### DISCLAIMER:
<b>Please note:</b> This script is meant for demo purposes only. All tools/ scripts in this repo are released for use "AS IS" without any warranties of any kind, including, but not limited to their installation, use, or performance. Any use of these scripts and tools is at your own risk. There is no guarantee that they have been through thorough testing in a comparable environment and we are not responsible for any damage or data loss incurred with their use.
You are responsible for reviewing and testing any scripts you run thoroughly before use in any non-testing environment.