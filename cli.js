#!/usr/bin/env node

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
let arg = remain.shift();

let cli = {

	flow: {
		start: () => {

		},
		stop: () => {

		}
	},

	node: {
		install: () => {

			xible.Registry.Node
				.getByName(arg)
				.then((node) => node.install())
				.catch((err) => {
					console.log(err);
				});

		},
		search: () => {

			xible.Registry.Node
				.search(arg)
				.then((nodes) => {

					Object.keys(nodes).forEach((nodeName) => {

						nodes[nodeName]
							.getRegistryData()
							.then((data) => {
								console.log(`${nodeName}: ${data.description}: ${data['dist-tags'].latest}`);
							});

					});

				})
				.catch((err) => {
					console.log(err);
				});

		}
	},

	config: {
		set: () => {
			xible.Config.setValue(arg, remain.shift());
		},
		delete: () => {
			xible.Config.deleteValue(arg);
		},
		get: () => {

			if (!arg) {
				return this.list();
			}

			console.log(xible.Config.getValue(arg));

		},
		list: () => {
			console.log(xible.Config.getAll());
		}
	}

};

function printUsage(path) {

	if (context !== 'help') {
		console.log(`Unrecognized context: "${context}"\n`);
	}

	console.log(`Usage: xible ${cli[context]?'context':'<context>'} <command>\n\nWhere ${cli[context]?'<command>':'<context>'} is one of:\n\t${Object.keys(path).join(', ')}\n`);
	console.log('Type: xible <context> help for more help about the specified context.');

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
