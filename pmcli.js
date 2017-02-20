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

process.title = 'xible package manager';
console.log(`XIBLE PACKAGE MANAGER\n`);

//basic requires
const os = require('os');
const fs = require('fs');
const url = require('url');
const readline = require('readline');

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
		publish: function() {
			console.log(`Not implemented yet`);
		},
		install: function() {
			console.log(`Not implemented yet`);
		},
		remove: function() {
			console.log(`Not implemented yet`);
		},
		search: function() {
			console.log(`Not implemented yet`);
		}
	},

	nodepack: {
		publish: function() {

			return console.log(`Not implemented yet`);

			//find package.json and use that name

			if (!ARG) {
				return console.log(`The nodepack name argument is required.`);
			}

			//verify that we have a token
			let token = getUserToken();

			if (!token) {
				return console.log(`You are not logged in. Run "xiblepm user login" or "xiblepm user add" to create a new user.`);
			}

			//verify that we're logged in
			xible.Registry.User
				.getByToken(token)
				.then((user) => {

					if (!user) {
						return console.log(`User could not be verified. Please login using "xiblepm user login".`);
					}

					//verify if this node had been published before
					xible.Registry.NodePack
						.getByName(ARG)
						.then((nodePack) => {

							//verify that whoami equals the remote user
							//xible registry will verify this also
							if (nodePack && nodePack.publishUserName !== user.name) {
								return console.log(`Nodepack "${nodePack.name}" was previously published by "${nodePack.publishUserName}". You are currently logged in as "${user.name}".`);
							}

							//publish
							xible.Registry.NodePack
								.publish(ARG)
								.then((nodePack) => {
									console.log(`Published.`);
								})
								.catch((err) => {
									console.log(err);
								});

						});

				});

		},
		install: function() {

			xible.Registry.NodePack
				.getByName(ARG)
				.then((nodePack) => nodePack.install())
				.catch((err) => {
					console.log(err);
				});

		},
		remove: function() {
			console.log(`Sorry: not implemented yet.`);
		},
		search: function() {

			xible.Registry.Node
				.search(ARG)
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
		set: function() {
			xible.Config.setValue(ARG, remain.shift());
		},
		delete: function() {
			xible.Config.deleteValue(ARG);
		},
		get: function() {

			if (!ARG) {
				return this.list();
			}

			console.log(xible.Config.getValue(ARG));

		},
		list: function() {
			console.log(JSON.stringify(xible.Config.getAll(), null, '\t'));
		}
	},

	user: {
		me: function() {
			this.whoami();
		},
		whoami: function() {

			let token = getUserToken();

			if (!token) {
				return console.log(`Not logged in.`);
			}

			xible.Registry.User
				.getByToken(token)
				.then((user) => {
					console.log(user.name);
				})
				.catch((err) => {
					console.log(err);
				});

		},
		logout: function() {
			setUserToken(null);
		},
		login: function() {

			let user = new xible.Registry.User();

			getUserInput(`Enter your username: `)
				.then((userName) => {

					user.name = userName;
					return getUserInput(`Enter your password: `, true);

				})
				.then((password) => {

					if (!password) {
						return Promise.reject(`You need to enter a password.`);
					}

					user.password = password;

					return user.getToken();

				})
				.then((token) => {

					if (!token) {
						return Promise.reject(`No token returned.`);
					}

					setUserToken(token);

				})
				.catch((err) => {
					console.log(err);
				});

		},
		add: function() {

			let newUser = new xible.Registry.User();

			getUserInput(`Enter your username: `)
				.then((userName) => {

					if (!userName) {
						return Promise.reject(`You need a username.`);
					} else if (!/^[a-zA-Z0-9_-]{3,}$/.test(userName)) {
						return Promise.reject(`Your username may only contain upper and lower case letters, numbers, an underscore and a dash.\nIt must also be at least 3 characters long.`);
					}

					newUser.name = userName;
					return getUserInput(`Enter your email address: `);

				})
				.then((emailAddress) => {

					if (!emailAddress) {
						return Promise.reject(`You need an email address.`);
					} else if (!/^.+@.+\..+$/.test(emailAddress)) {
						return Promise.reject(`You need a valid email address.`);
					}

					newUser.emailAddress = emailAddress;
					return getUserInput(`Enter your password: `, true);

				})
				.then((password) => {

					if (!password) {
						return Promise.reject(`You need a password.`);
					}

					newUser.password = password;
					return getUserInput(`Verify your password: `, true);

				})
				.then((password) => {

					if (newUser.password !== password) {
						return Promise.reject(`Passwords do not match.`);
					}

					return xible.Registry.User
						.add(newUser)
						.then((token) => {

							if (!token) {
								return Promise.reject(`No token returned.`);
							}

							setUserToken(token);

						});

				})
				.catch((err) => {
					console.log(err);
				});

		}
	}

};

function getUserInput(question, pwd) {

	return new Promise((resolve, reject) => {

		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

		if (pwd) {

			let stdin = process.openStdin();
			process.stdin.on("data", function(char) {
				char = char + "";
				switch (char) {
					case "\n":
					case "\r":
					case "\u0004":
						stdin.pause();
						break;
					default:
						process.stdout.write(`\u001b[2K\u001b[200D${question}`);
						break;
				}
			});

		}

		rl.question(question, (value) => {

			rl.close();
			resolve(value);

		});

	});

}

function getStrippedRegistryUrl() {

	//determine the stripped registry url
	let registryUrl = xible.Config.getValue('registry.url');
	let parsedRegistryUrl = url.parse(registryUrl);
	delete parsedRegistryUrl.protocol;
	delete parsedRegistryUrl.auth;
	delete parsedRegistryUrl.query;
	delete parsedRegistryUrl.search;
	delete parsedRegistryUrl.hash;
	return url.resolve(url.format(parsedRegistryUrl), '.');

}

function getUserToken() {
	let regUrl = getStrippedRegistryUrl();
	try {

		let rc = require(`${os.homedir()}/.xiblerc.json`);
		return rc[regUrl] && rc[regUrl].token;

	} catch (err) {
		return null;
	}

}

function setUserToken(token) {

	let regUrl = getStrippedRegistryUrl();
	let rc = {};
	try {
		rc = require(`${os.homedir()}/.xiblerc.json`);
	} catch (err) {
		//doesn't exist
	}

	if (!rc[regUrl]) {
		rc[regUrl] = {};
	}
	rc[regUrl].token = token;

	fs.writeFileSync(`${os.homedir()}/.xiblerc.json`, JSON.stringify(rc, null, `\t`));

}

function printUsage(path) {

	if (context !== 'help') {
		console.log(`Unrecognized context: "${context}"\n`);
	}

	console.log(`Usage: xiblepm ${cli[context]?context:'<context>'} <command>\n\nWhere ${cli[context]?'<command>':'<context>'} is one of:\n\t${Object.keys(path).join(', ')}\n`);

	if (cli[context]) {
		console.log('Type: xiblepm <context> help for more help about the specified context.');
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
