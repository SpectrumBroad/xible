# XIBLE
A visual programming language. Visit <https://xible.io> for more information.

[![npm](http://img.shields.io/npm/v/xible.svg?style=flat-square)](http://www.npmjs.org/xible)

## Installation
See the [installation documentation](https://xible.io/docs/installation) for details.

Once you have Node.js installed;
-   On Linux &amp; maxOS run: `sudo npm i xible -g --production`
-   On Windows run: `npm i xible -g --production`

## Start XIBLE
After installation is completed;
1. `xible server start`
2. Navigate to <http://localhost:9600>. Or replace "_localhost_" with the actual address of the machine where you installed XIBLE.

## Automatically start XIBLE
To automatically start XIBLE on boot ([requires](https://www.xible.io/docs/commandlinetools/xible.htm#service.enable) a [Linux installation](https://www.xible.io/docs/installation.htm#linux));
1. `sudo xible service enable`
2. `sudo xible service start` to start it immediately.
