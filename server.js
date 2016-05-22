const debug = require('debug');

//config
const config = require('./config.json');

//cluster
const cluster = require('cluster');

//flux
const Flux = require('./index.js');

if (cluster.isMaster) {

	//setup client requests over http
	const expressDebug = debug('flux:express');
	const express = require('express');
	const bodyParser = require('body-parser');
	expressApp = express();
	expressApp.use(bodyParser.json());

	//setup default express stuff
	expressApp.use(function(req, res, next) {

		res.removeHeader("X-Powered-By");

		//disable caching
		res.header('cache-control', 'private, no-cache, no-store, must-revalidate');
		res.header('expires', '-1');
		res.header('pragma', 'no-cache');

		//access control
		res.header('access-control-allow-origin', '*');
		res.header('access-control-allow-headers', 'x-access-token, content-type');
		res.header('access-control-allow-methods', 'GET,PUT,POST,PATCH,DELETE,OPTIONS,HEAD');

		//local vars for requests
		req.locals = {};

		next();

	});

	//init the webserver
	expressDebug(`starting on port: ${config.webServer.port}`);
	const expressServer = expressApp.listen(config.webServer.port, function() {

		expressDebug(`listening on: ${expressServer.address().address}:${expressServer.address().port}`);

		//websocket
		const wsDebug = debug('flux:websocket');
		const ws = require('ws');
		const webSocketServer = new ws.Server({
			port: config.webSocketServer.port
		}, () => {

			wsDebug(`listening on port: ${config.webSocketServer.port}`);

			var flux = new Flux({
				expressApp: expressApp,
				webSocketServer: webSocketServer,
				nodesPath: './nodes'
			});

		});

	});

} else {

	var flux = new Flux({
		nodesPath: './nodes'
	});

	var flow;

  //init message handler
	process.on('message', message => {

		switch (message.method) {

			case 'start':

				flow = new flux.Flow(flux, message.flow);
				flow.start();

				break;

			case 'stop':

				if (flow) {
					flow.stop();
				}

				break;

		}

	});

  //inform the master we're done
  process.send({method:'init'});

}
