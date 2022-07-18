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

Follow the [Version 2.2 Two-way System Drawing](./Version_2_2_Two-way_System_Drawing.pdf) diagrams for hardware setup.  

Install GMM_Lib.js, JoinSplit.js and VoiceSwitch.js on each codec (primary and secondary)  

Edit JoinSplit.js and VoiceSwitch.js on each codec and follow instructions in comments in first sections to edit constants as 
applicable.  

Turn on only the JoinSplit and VoiceSwitch macros on each codec starting with those on the Primary and then on the Secondary codec.  

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