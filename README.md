# XIBLE
A visual programming language. Visit <https://xible.io> for more information.

## Installation
Once you have Node.js installed, simply run;
1. `sudo npm install -g xible`

## Start XIBLE
After installation is completed;
1. `xible server start`
2. Navigate to <http://localhost:9600>. Or replace "_localhost_" with the actual address of the machine where you installed XIBLE.

## Automatically start XIBLE
To automatically start XIBLE on boot ([requires](https://www.xible.io/docs/commandlinetools/xible.htm#service.enable) a [Linux installation](https://www.xible.io/docs/installation.htm#linux));
1. `sudo xible service enable`
2. `sudo xible service start` to start it immediately.

## Browser support
The browser based graphical editor which comes with XIBLE is currently only supported by the Google Chrome browser; versions 53 and up. Opera, which is based on the same engine as Chrome, is also supported starting from version 44.

Other browsers may work, but some editor functionality is unavailable if Shadow DOM v1 is not implemented. It will be possible to start, stop and delete flows, but deploying and saving is disabled. Also, the detail settings of nodes are not visible.
