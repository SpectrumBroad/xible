'use strict';

const cluster = require('cluster');
const CONFIG_PATH = './config.json';
const Xible = require('./index.js');

if (cluster.isMaster) {

	const XibleRegistryWrapper = require('../xibleRegistryWrapper');

	const debug = require('debug');
	const xibleDebug = debug('xible');
	xibleDebug(process.versions);

	let xible = new Xible({
		configPath: CONFIG_PATH
	});

} else {

	let flow;

	process.on('unhandledRejection', (reason, p) => {

		console.log('unhandled rejection:', reason);

		if (flow) {

			if (cluster.worker.isConnected()) {

				process.send({
					method: 'stop'
				});

			} else {
				flow.stop();
			}

		}

	});

	//init message handler
	process.on('message', (message) => {

		switch (message.method) {

			case 'start':

				try {

					//get the nodenames we need to init
					let nodeNames = {};
					message.flow.nodes.forEach((node) => {
						if (!nodeNames[node.name]) {
							nodeNames[node.name] = true;
						}
					});

					//setup xible with the nodeNames
					let xible = new Xible({
						configPath: CONFIG_PATH,
						nodeNames: Object.keys(nodeNames)
					});

					flow = new xible.Flow();
					flow.initJson(message.flow);

					if (message.directNodes) {
						flow.direct(message.directNodes);
					} else {
						flow.start();
					}

				} catch (err) {

					console.log('exception:', err);

					if (flow) {

						if (cluster.worker.isConnected()) {

							process.send({
								method: 'stop'
							});

						} else {
							flow.stop();
						}

					}

				}

				break;

			case 'stop':

				if (flow) {
					flow.stop();
				}

				break;

			case 'directNodes':

				if (flow) {
					flow.direct(message.directNodes);
				}

				break;

		}

	});

	//inform the master we're done
	if (cluster.worker.isConnected()) {
		process.send({
			method: 'init'
		});
	}

}
