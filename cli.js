#!/usr/bin/env node

'use strict'; /* jshint ignore: line */

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

//option parsing
const nopt = require('nopt');
let knownOpts = {
	config: String
};
let shortHands = {
	'c': '--config'
};
let opts = nopt(knownOpts, shortHands);
let remain = opts.argv.remain;
let context = remain.shift() || 'help';
let command = remain.shift();
const ARG = remain.shift();

//get a xible instance
const CONFIG_PATH = opts.config || `~/.xible/config.json`;
const Xible = require('./index.js');
let xible = new Xible({
	configPath: CONFIG_PATH
});

//cli commands
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

			//TODO: support windows

			const fs = require('fs-extra');
			fs.copySync(`${__dirname}/xible.service`, '/etc/systemd/system/xible.service');

		},
		enable: function() {

			//TODO: support windows

			this.install();
			const exec = require('child_process').exec;
			exec('systemctl enable xible.service', (err, stdout, stderr) => {

				if (err) {
					return console.log(`Failed to enable service: ${err}`);
				}

				console.log('' + stdout);
				console.log('Service enabled. Xible will now automatically start at boot.');

			});

		},
		disable: function() {

			//TODO: support windows

			const exec = require('child_process').exec;
			exec('systemctl disable xible.service', (err, stdout, stderr) => {

				if (err) {
					return console.log(`Failed to disable service: ${err}`);
				}

				console.log('' + stdout);
				console.log('Service disabled.');

			});

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

	if (cli[context]) {
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
