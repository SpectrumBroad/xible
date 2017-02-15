#!/usr/bin/env node

'use strict';	/* jshint ignore: line */

// windows: running "npm blah" in this folder will invoke WSH, not node.
/*global WScript*/
if (typeof WScript !== 'undefined') {
	WScript.echo(
		'npm does not work when run\n' +
		'with the Windows Scripting Host\n\n' +
		"'cd' to a different directory,\n" +
		"or type 'npm.cmd <args>',\n" +
		"or type 'node npm <args>'."
	);
	WScript.quit(1);
	return;
}

process.title = 'xible';
console.log(`XIBLE\n`);

//start with debug logging enabled until we have a 'normal' way of logging
process.env.DEBUG = 'xible*';

//get a xible instance
const CONFIG_PATH = './config.json';
const Xible = require('./index.js');
let xible = new Xible({
	configPath: CONFIG_PATH
});

//option parsing
const nopt = require('nopt');
let knownOpts = {};
let shortHands = {};
let opts = nopt(knownOpts, shortHands);
let remain = opts.argv.remain;
let context = remain.shift() || 'help';
let command = remain.shift();
const ARG = remain.shift();

let cli = {

	flow: {

		start: function() {
			console.log(`Not implemented yet`);
		},
		stop: function() {
			console.log(`Not implemented yet`);
		}

	},

	server: {

		install: function() {
			console.log('Not implemented yet');
		},
		start: function() {
			xible.init();
		}

	}

};

function printUsage(path) {

	if (context !== 'help') {
		console.log(`Unrecognized context: "${context}"\n`);
	}

	console.log(`Usage: xible ${cli[context]?context:'<context>'} <command>\n\nWhere ${cli[context]?'<command>':'<context>'} is one of:\n\t${Object.keys(path).join(', ')}\n`);

	if(cli[context]) {
		console.log('Type: xible <context> help for more help about the specified context.');
	}
}

if (cli[context]) {

	if (!command && typeof cli[context] === 'function') {
		cli[context]();
	} else if (command && typeof cli[context][command] === 'function') {
		cli[context][command](opts);
	} else {
		printUsage(cli[context]);
	}

}

if (!cli[context]) {
	printUsage(cli);
}
