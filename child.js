'use strict'; /* jshint ignore: line */

const Xible = require('./index.js');

let flow;

//always stop on unhandled promise rejections
process.on('unhandledRejection', (reason, p) => {

	console.log('unhandled rejection:', reason);
	if (process.connected) {

		process.send({
			method: 'stop',
			error: reason
		});

	} else if (flow) {
		flow.stop();
	}

});

//init message handler
process.on('message', (message) => {

	switch (message.method) {

		case 'start':

			//setup xible with the nodeNames
			let xible = new Xible({
				child: true
			}, message.config);

			//init the proper nodes
			let structuredNodes = {};
			let flowNodes = message.flow.nodes;
			for (let i = 0; i < flowNodes.length; ++i) {

				let nodeName = flowNodes[i].name;

				if (structuredNodes[nodeName]) {
					continue;
				}
				structuredNodes[nodeName] = true;

				//require the actual node and check it was loaded properly
				let requiredNode = requireNode(message.nodes[nodeName].path);
				if (!requiredNode) {
					return;
				}
				xible.addNode(nodeName, message.nodes[nodeName], requiredNode);

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

					//inform the master that we actually started
					if (process.connected) {
						process.send({
							method: 'started'
						});
					}

				});

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

/**
 *	requires the path to a Node
 *	the try/catch prevents proper compilation by the v8 engine
 *	that's why it is in a seperate function
 *	@param {String}	nodePath the path to the node-directory where index.js resides
 *	@returns {Function|null}
 */
function requireNode(nodePath) {
	try {
		return require(nodePath);
	} catch (err) {

		console.log('exception:', err);
		if (process.connected) {

			process.send({
				method: 'stop',
				error: err
			});

		} else if (flow) {
			flow.stop();
		}

		return null;

	}
}

//inform the master we have finished init
if (process.connected) {
	process.send({
		method: 'init'
	});
}
