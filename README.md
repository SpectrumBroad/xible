# XIBLE
A visual programming language. Visit <https://xible.io> for more information.

## Installation
Once you have nodejs installed, simply run;
1.  <code>sudo npm install -g xible</code>

## Start XIBLE
After installation is completed;
1.  <code>sudo xible server start</code>
2.  Navigate to <http://localhost:9600>. Or replace "_localhost_" with the actual address of the machine where you installed xible.

## Automatically start XIBLE
To automatically start XIBLE on boot;
1.  <code>sudo xible server enable</code>

## Browser support
The browser based graphical editor which comes with XIBLE is currently only supported by the Google Chrome browser; versions 53 and up.

Other browsers may work, but some editor functionality is unavailable if Shadow DOM v1 is not implemented. It will be possible to start, stop and delete flows, but deploying and saving is disabled. Also, the detail settings of nodes are not visible.
