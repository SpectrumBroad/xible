'use strict';

const debug = require('debug');
const cluster = require('cluster');

const config = require('./config.json');

//flux
const Flux = require('./index.js');

if (cluster.isMaster) {

	//setup client requests over https
	const spdy = require('spdy');
	const expressDebug = debug('flux:express');
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

	//init the webserver
	expressDebug(`starting on port: ${config.webServer.port}`);

	const spdyServer = spdy.createServer({
		key: fs.readFileSync('./ssl/ssl.key'),
		cert: fs.readFileSync('./ssl/ssl.crt')
	}, expressApp).listen(config.webServer.port, function() {

		expressDebug(`listening on: ${spdyServer.address().address}:${spdyServer.address().port}`);

		//websocket
		const wsDebug = debug('flux:websocket');
		const ws = require('ws');

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

			new Flux({
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

	let flux = new Flux({
		nodesPath: './nodes'
	});

	//init message handler
	process.on('message', (message) => {

		switch (message.method) {

			case 'start':

				try {

					flow = new flux.Flow(flux);
					flow.initJson(message.flow);

					if (message.directNodes) {
						flow.direct(message.directNodes);
					} else {
						flow.start();
					}

				} catch (e) {

					console.log('exception:', e);

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
