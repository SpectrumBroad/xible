'use strict';	/* jshint ignore: line */

const CONFIG_PATH = './config.json';
const Xible = require('./index.js');

new Xible({
	configPath: CONFIG_PATH
}).init();
