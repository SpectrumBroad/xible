module.exports = function(NODE) {

	let expressApp;

	let serverOut = NODE.getOutputByName('server');
	serverOut.on('trigger', (conn, state, callback) => {

		if (!expressApp) {

			this.once('init', () => callback(expressApp));
			return;

		}

		callback(expressApp);

	});

	NODE.on('init', (state) => {

		const express = require('express');
		const bodyParser = require('body-parser');
		const spdy = require('spdy');
		const fs = require('fs');

		expressApp = express();
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

			NODE.addStatus({
				message: `${req.method} ${req.originalUrl}`,
				timeout: 1000
			});

			if ('OPTIONS' === req.method) {
				return res.status(200).end();
			}

			//local vars for requests
			req.locals = {};

			next();

		});

		const spdyServer = spdy.createServer({
			key: fs.readFileSync('./ssl/ssl.key'),
			cert: fs.readFileSync('./ssl/ssl.crt')
		}, expressApp).listen(NODE.data.port, () => {

			NODE.addStatus({
				message: `running`,
				color: 'green'
			});

		});

	});

};
