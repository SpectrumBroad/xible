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

function logError(msg, exitCode) {

	console.error(msg);
	process.exitCode = exitCode || 1;

}

//cli commands
let cli = {

	flow: {
		publish: function() {
			logError(`Not implemented yet`);
		},
		install: function() {
			logError(`Not implemented yet`);
		},
		remove: function() {
			logError(`Not implemented yet`);
		},
		search: function() {
			logError(`Not implemented yet`);
		}
	},

	nodepack: {
		publish: function() {

			if (!xible.Config.getValue('registry.nodepacks.allowpublish')) {
				return logError(`Your config does not allow to publish nodepacks to the registry`);
			}

			//find package.json and use that name
			//let packageJson=require(`package.json`);
			fs.readFile('package.json', (err, data) => {

				if (err) {
					return logError(`Could not read "package.json": ${err}`);
				}

				//check that we have json
				let packageJson;
				let nodePackName;
				try {
					packageJson = JSON.parse(data);
				} catch (err) {
					return logError(`Could not parse "package.json": ${err}`);
				}

				//verify that we have a name
				nodePackName = packageJson.name;
				if (!nodePackName) {
					return logError(`Could not locate "name" property in "package.json"`);
				}

				//verify that we have a token
				let token = getUserToken();

				if (!token) {
					return logError(`You are not logged in. Run "xiblepm user login" or "xiblepm user add" to create a new user.`);
				}

				//verify that we're logged in
				xible.Registry.User
					.getByToken(token)
					.then((user) => {

						if (!user) {
							return logError(`User could not be verified. Please login using "xiblepm user login".`);
						}

						//verify if this node had been published before
						xible.Registry.NodePack
							.getByName(nodePackName)
							.then((nodePack) => {

								//verify that whoami equals the remote user
								if (nodePack && nodePack.publishUserName !== user.name) {
									return logError(`Nodepack "${nodePack.name}" was previously published by "${nodePack.publishUserName}". You are currently logged in as "${user.name}".`);
								}

								//publish
								xible.Registry.NodePack
									.publish({
										name: nodePackName,
										registry: {
											url: `https://registry.npmjs.com/${nodePackName}`
										}
									}, token)
									.then((nodePack) => {
										console.log(`Published nodepack "${nodePack.name}".`);
									})
									.catch((err) => logError(`Failed to publish nodepack "${nodePack.name}": ${err}`));

							}).catch((err) => logError(`Failed to get nodepack from registry: ${err}`));

					}).catch((err) => logError(`Failed to get user from token: ${err}`));

			});

		},
		install: function() {

			if (!xible.Config.getValue('registry.nodepacks.allowinstall')) {
				return logError(`Your config does not allow to install nodepacks from the registry`);
			}

			xible.Registry.NodePack
				.getByName(ARG)
				.then((nodePack) => {
					if(!nodePack) {
						return logError(`Nodepack "${ARG}" does not exist`);
					}
					nodePack.install();
				})
				.catch((err) => logError(err));

		},
		remove: function() {
			logError(`Sorry: not implemented yet.`);
		},
		search: function() {

			xible.Registry.NodePack
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
				.catch((err) => logError(err));

		}
	},

	config: {
		set: function() {

			let value = remain.shift();
			if (value === 'true') {
				value = true;
			} else if (value === 'false') {
				value = false;
			}

			xible.Config.setValue(ARG, value);

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
				.catch((err) => logError(err));

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
				.catch((err) => logError(err));

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
				.catch((err) => logError(err));

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
		logError(`Unrecognized context: "${context}"\n`);
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
