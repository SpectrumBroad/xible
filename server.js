'use strict';

const cluster = require('cluster');
const config = require('./config.json');
const Xible = require('./index.js');

if (cluster.isMaster) {

	const XibleRegistryWrapper = require('../xibleRegistryWrapper');

	const debug = require('debug');
	const xibleDebug = debug('xible');
	xibleDebug(process.versions);

	//setup client requests over https
	const spdy = require('spdy');
	const expressDebug = debug('xible:express');
	const express = require('express');
	const bodyParser = require('body-parser');
	const fs = require('fs');

	let expressApp = express();
	expressApp.use(bodyParser.json());

	//setup default express stuff
	expressApp.use(function(req, res, next) {

		res.removeHeader('X-Powered-By');

		//disable caching
		res.header('cache-control', 'private, no-cache, no-store, must-revalidate');
		res.header('expires', '-1');
		res.header('pragma', 'no-cache');

		//access control
		res.header('access-control-allow-origin', '*');
		res.header('access-control-allow-headers', 'x-access-token, content-type');
		res.header('access-control-allow-methods', 'GET,PUT,POST,PATCH,DELETE,OPTIONS,HEAD');

		expressDebug(`${req.method} ${req.originalUrl}`);

		if ('OPTIONS' === req.method) {
			return res.status(200).end();
		}

		//local vars for requests
		req.locals = {};

		next();

	});

	//editor
	expressApp.use(express.static('editor', {
		index: false
	}));

	//init the webserver
	expressDebug(`starting on port: ${config.webServer.port}`);

	const spdyServer = spdy.createServer({
		key: fs.readFileSync('./ssl/ssl.key'),
		cert: fs.readFileSync('./ssl/ssl.crt')
	}, expressApp).listen(config.webServer.port, function() {

		expressDebug(`listening on: ${spdyServer.address().address}:${spdyServer.address().port}`);

		//websocket
		const wsDebug = debug('xible:websocket');
		const ws = require('uws');

		const spdyWebSocketServer = spdy.createServer({

			key: fs.readFileSync('./ssl/ssl.key'),
			cert: fs.readFileSync('./ssl/ssl.crt')

		}, function(req, res) {

			res.writeHead(200);
			res.end('socket');

		}).listen(config.webSocketServer.port, () => {

			wsDebug(`listening on port: ${config.webSocketServer.port}`);

			const webSocketServer = new ws.Server({
				server: spdyWebSocketServer
			});

			new Xible({
				express: express,
				expressApp: expressApp,
				webSocketServer: webSocketServer,
				nodesPath: './nodes',
				flowsPath: './flows'
			});

		});

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
						nodesPath: './nodes',
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
