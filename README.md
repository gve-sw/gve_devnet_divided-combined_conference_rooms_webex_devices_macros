# GVE DevNet Divided-Combined Conference Rooms Webex Devices Macros

Macros to automate dividing and combining conference rooms with Webex Codec Pro devices so that the same equipment can be used in both modes to join conference calls

NOTE: A newer variant of this macro which supports multiple secondary rooms for supporting N-Way divisible rooms and makes the use of GPIO Pins for communicating between codecs optional is posted at:  
https://github.com/gve-sw/gve_devnet_n_way_divisible_conference_rooms_webex_devices_macros  
Moving forward, all new enhancements for these divisible room macro samples will be implemented in that repository.

3/3/23 Updates:

- Updated support for USB Mode v3 macro to support version v3-0-7 Beta
- Added support for RoomOS 11 HDMI Passthrough (call from Laptop) feature
- Added ability to set SpeakerTrack default behavior in RoomOS 11 with ST_DEFAULT_BEHAVIOR constant

## Contacts

- Gerardo Chaves (gchaves@cisco.com)
- Enrico Conedera (econeder@cisco.com)

## Solution Components

- Webex Collaboration Endpoints
- Javascript
- xAPI

## Requirements

- Minimum RoomOS version 10.17.1
- If running RoomOS 11 , minimum version is 11.2.1.0
- Codec Pro with QuadCam or SpeakerTrack 60 camera array on each room (SP60 support is experimental)

## Installation/Configuration

Follow the [Version 3 Two-way System Drawing](./Version_3_Two-way_System_Drawing.pdf) diagrams for hardware setup.

For configuration setup and further hardware setup instructions, refer to the [Installation Instructions for Divisible Conference Rooms Version 3.1](./Installation_Instructions_for_Divisible_Conference_Rooms_Version_3_1.pdf) document in this repository.

Install GMM_Lib.js and join_split.js on each codec (primary and secondary)

If you wish to use the USB Mode v3 macro for USB passthru , install the USB_Mode_Version_3.js macro onto the codec(s) you wish to use it with.

Here is a summary of each macro in this repository:

### GMM_Lib.js

This is a library shared by various Webex Device macros that simplifies communication between codecs and modules on the same codec.  
More details at: https://github.com/CiscoDevNet/roomdevices-macros-samples/tree/master/Global%20Macro%20Messaging

### USB_Mode_Version_3.js

This module is optional. It is a Beta version of the USB Mode V3 macro. Once the official version is published, you can use that version instead.

### join_split_base.js

This is a consolidated join/split and switching module meant to work together with the optional USB Mode version 3 module via events on the same codec and across codecs with the GMM library.  
In addition to handling configuration changes when combining or splitting rooms and switching video inputs based on active speakers, it handles communications needed between Primary and Secondary codecs to keep the codec awake and set the correct video layouts

Once you have installed join_split_base.js in both the Primary and Secondary codecs, edit as needed the constants in sections 1 through 6 of that file before turning on the macro.

Detailed instructions on each settings in those sections are provided in the macro itself in the form
of code comments.

IMPORTANT: Turn on the join_split_base macro on the Primary codec before turning it on in Secondary to give the macro a chance to set PIN 4 to the correct Join/Split state according to what is stored in permanent storage. Also, turn on only the join_split_base macro on each codec. DO NOT turn on the GMM_Lib macro, it is just a library included by the other two.

NOTE: Never change the Video Monitors, Ultrasound MaxVolume, WakeupOnMotionDetection or StandbyControl settings on the Secondary codec while in combined mode. These settings are stored when going from split to combined mode to restore once back in split mode so if you change them while combined the wrong settings could be stored away in persistent memory. The safest option is to set those on either codec only in split mode and while the macro is off.

NOTE: If using WebRTC calls with RoomOS 11, do not attempt to configure microphone 1 for the macro to use since, as of RoomOS version 11.0.0.4 , we do not get VuMeter events for microphone 1 when in WebRTC calls so the whole switching logic between rooms in combined mode is compromised.

## Usage

Once the macros are running and have done the initial configuration, you can switch room configurations from joined/combined to split/standalone by either triggering the wall switch with the divider wall between them or manually on the Touch10 or Navigator associated to the Primary codec as per configuration of the USE_WALL_SENSOR constant in join_split_base.js of the Primary codec.

To trigger the automatic switching behavior between rooms when combined, either connec to a call or manually turn on SpeakerTrack on the quadcam.

If you turn off SpeakerTrack manually while in a call, the automatic switching will pause until you turn it back on again. During this time, you can select another camera in the codec, such as a PTZ camera focused on a Whiteboard, which will be used in the call and even when there is audio activity in the secondary room the macro will not switch to that camera until you turn speakertrack back on.

During a call, you can use the Auto Q&A custom panel button to turn on PresenterTrack with our without the Q&A mode option. When in Presenter Track mode with with Q&A mode enabled, the macro will take care of keeping the focus on the presenter and if a question comes in from the audience from either room it will compose the image of the presenter plust the audience member while they are talking and a few seconds afterwards (controlled by the PRESENTER_QA_KEEP_COMPOSITION_TIME configurable constant in the macro)

The macro works when used in combination with the USB Mode v3 macro. Please note that when in USB Mode, you cannot combine or split rooms until you exit out of that mode.

NOTE: WebRTC support in RoomOS 10 (i.e. calls to Google Meet) in this macro is "experimental" due to lack of full support for camera swtiching when WebRTC calls. The switching in this is accomplished by temporarily muting video, switching and then turning back on with a 1.5 second delay so you will experience a blank screen being sent to the other end during that switching. Please note that if you turn off automation manually by turning off Speakertrack while in a WebRTC call, even if you select a different camera it will not be sent automatically to the other side since the "workaround" of muting for 1.5 seconds is disabled when the macro is not in automatic switching mode. In this situation, you must manually select the new camera to use, mute the outgoing video using the Touch 10 button, wait at least 1.5 seconds and then Un-mute the video also on the Touch10 button.  
For RoomOS 11 Beta, there is full support for camera switching in WebRTC calls without the delays described above, but it still cannot compose two video inputs side by side in overview moder or in Presenter QA mode so in those situations the macro will just send one video input.

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
