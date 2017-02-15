'use strict';

const CONFIG_PATH = './config.json';
const Xible = require('./index.js');

let flow;

process.on('unhandledRejection', (reason, p) => {

	console.log('unhandled rejection:', reason);

	if (flow) {

		if (process.connected) {

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

				//setup xible with the nodeNames
				let xible = new Xible({
					child: true,
					configPath: CONFIG_PATH
				});

				//init the proper nodes
				let structuredNodes = {};
				for (let i = 0; i < message.flow.nodes.length; ++i) {

					let nodeName = message.flow.nodes[i].name;

					if (structuredNodes[nodeName]) {
						continue;
					}
					structuredNodes[nodeName] = true;
					xible.addNode(nodeName, message.nodes[nodeName], require(message.nodes[nodeName].path));

				}

				xible.init()
					.then(() => {

						flow = new xible.Flow();
						flow.initJson(message.flow);

						if (message.directNodes) {
							flow.direct(message.directNodes);
						} else {
							flow.start();
						}

					});

			} catch (err) {

				console.log('exception:', err);

				if (flow) {

					if (process.connected) {

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
if (process.connected) {
	process.send({
		method: 'init'
	});
}
