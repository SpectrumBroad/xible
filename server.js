'use strict';	/* jshint ignore: line */

const CONFIG_PATH = './config.json';
const Xible = require('./index.js');
const debug = require('debug');
const xibleDebug = debug('xible');
xibleDebug(process.versions);

new Xible({
	configPath: CONFIG_PATH
}).init();
