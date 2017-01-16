'use strict';

//setup debug
const debug = require('debug');
const webSocketDebug = debug('xible:webSocket');
const cluster = require('cluster');

//config flags
const WEB_SOCKET_THROTTLE = 100; //<1 === don't throttle
const STAT_INTERVAL = 1000; //a value below the broadcast throttle interval (100) won't have any effect

//save statuses so new clients can see statuses that were send earlier than their connection start
let statuses = {};

const Xible = module.exports = function Xible(obj) {

	this.nodes = {};
	this.flows = {};
	this.configPath = obj.configPath;

	const Config = this.Config = require('./app/Config')(this, this.express, this.expressApp);

	//host the client nodes
	if (cluster.isMaster) {

		this.initWeb();

		//load config again so it can host the xpressAp
		this.Config = require('./app/Config')(this, this.express, this.expressApp);

	}

	//get and load the modules
	this.Node = require('./app/Node')(this, this.express, this.expressApp);
	this.Flow = require('./app/Flow')(this, this.express, this.expressApp);

	//ensure catch all routes are loaded last
	if (this.expressApp) {
		require('./routes.js')(this, this.expressApp);
	}

	//get all installed nodes
	let nodesPath = Config.getValue('nodes.path');
	if (nodesPath) {
		this.Node.initFromPath(nodesPath, obj.nodeNames);
	}

	//get all installed flows
	let flowPath = Config.getValue('flows.path');
	if (flowPath && !obj.nodeNames) {
		this.Flow.initFromPath(flowPath);
	}

	this.initStats();

	if (cluster.isMaster && WEB_SOCKET_THROTTLE > 0) {

		//throttle broadcast messages
		setInterval(() => {

			if (broadcastWebSocketMessagesThrottle.length) {

				let message = JSON.stringify({
					method: 'xible.messages',
					messages: broadcastWebSocketMessagesThrottle
				});
				broadcastWebSocketMessagesThrottle = [];

				this.broadcastWebSocket(message);

			}

		}, WEB_SOCKET_THROTTLE);

	}

};


Xible.prototype.initStats = function() {

	if (cluster.isMaster) {

		//throttle broadcast flow stats every second
		setInterval(() => {

			let flows = this.getFlows();
			let flowsUsage = Object.keys(flows)
				.map((key) => flows[key])
				.filter((flow) => !!flow.usage)
				.map((flow) => ({
					_id: flow._id,
					usage: flow.usage
				}));

			this.broadcastWebSocket({
				method: 'xible.flow.usage',
				flows: flowsUsage
			});

		}, STAT_INTERVAL);

	} else {

		//report cpu and memory usage back to master
		//note that, at least on a raspi 3,
		//the resolution of cpuUsage is stuck to 1000ms or 1%
		let cpuUsageStart = process.cpuUsage();
		let cpuStartTime = process.hrtime();

		setInterval(() => {

			//get values over passed time
			let cpuUsage = process.cpuUsage(cpuUsageStart);
			let cpuTime = process.hrtime(cpuStartTime);

			//reset for next loop
			//this is different from the setImmediate approach for getting event loop delay
			//because we are using a setInterval, we may get negative delays back
			//not sure yet if that's correct or not
			cpuUsageStart = process.cpuUsage();
			cpuStartTime = process.hrtime();

			if (cluster.worker.isConnected()) {

				process.send({
					method: 'usage',
					usage: {
						cpu: {
							user: cpuUsage.user,
							system: cpuUsage.system,
							percentage: Math.round(100 * ((cpuUsage.user + cpuUsage.system) / 1000) / (cpuTime[0] * 1000 + cpuTime[1] / 1e6))
						},
						memory: process.memoryUsage(),
						delay: Math.round((cpuTime[0] * 1e9 + cpuTime[1] - STAT_INTERVAL * 1e6) / 1000)
					}
				});

			}

		}, STAT_INTERVAL).unref();

	}

};


Xible.getNativeModules = function() {

	return Object.keys(process.binding('natives')).filter(function(el) {
		return !/^_|^internal|\//.test(el);
	});

};


Xible.checkUsedDeps = function() {
	let depcheck = require('depcheck');
};


Xible.generateObjectId = Xible.prototype.generateObjectId = function() {

	function s4() {
		return Math.floor((1 + Math.random()) * 0x10000)
			.toString(16)
			.substring(1);
	}
	return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
		s4() + '-' + s4() + s4() + s4();

};


Xible.prototype.initWeb = function() {

	//setup client requests over https
	const spdy = require('spdy');
	const expressDebug = debug('xible:express');
	const express = this.express = require('express');
	const bodyParser = require('body-parser');
	const fs = require('fs');

	const expressApp = this.expressApp = express();
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
	let webPort = this.Config.getValue('webServer.port');
	expressDebug(`starting on port: ${webPort}`);

	const spdyServer = spdy.createServer({
		key: fs.readFileSync(this.Config.getValue('webServer.keyPath')),
		cert: fs.readFileSync(this.Config.getValue('webServer.certPath'))
	}, expressApp).listen(webPort, () => {

		expressDebug(`listening on: ${spdyServer.address().address}:${spdyServer.address().port}`);

		//websocket
		const wsDebug = debug('xible:websocket');
		const ws = require('ws'); //uws is buggy right now

		wsDebug(`listening on port: ${webPort}`);

		const webSocketServer = this.webSocketServer = new ws.Server({
			server: spdyServer
		});

		webSocketServer.on('connection', (client) => {

			webSocketDebug('connection');

			client.on('error', (err) => {
				webSocketDebug(`error: ${err}`);
			});

			client.on('close', () => {
				webSocketDebug('close');
			});

			//send out any existing statuses
			let statusesKeys = Object.keys(statuses);
			if (!statusesKeys.length) {
				return;
			}

			let messages = statusesKeys.map((statusId) => statuses[statusId]);

			client.send(JSON.stringify({
				method: 'xible.messages',
				messages: messages
			}), (err) => {
				if (err) {
					webSocketDebug(`error: ${err}`);
				}
			});

		});

	});

};


function handleBroadcastWebSocketError(err) {
	if (err) {
		webSocketDebug(`client websocket send failed: ${err}`);
	}
}


let broadcastWebSocketMessagesThrottle = [];
Xible.prototype.broadcastWebSocket = function(message) {

	if (!this.webSocketServer) {
		return;
	}

	//throttle any message that's not a string
	if (typeof message !== 'string') {

		//save some statuses to replay on new connections
		switch (message.method) {

			case 'xible.node.addStatus':

				statuses[message.status._id] = message;

				if (message.status.timeout) {
					setTimeout(() => {
						delete statuses[message.status._id];
					}, message.status.timeout);
				}

				break;

			case 'xible.node.updateStatusById':

				let copyMessage = Object.assign({}, message);
				copyMessage.method = 'xible.node.addStatus';
				statuses[copyMessage.status._id] = copyMessage;

				break;

			case 'xible.node.removeStatusById':
				delete statuses[message.status._id];
				break;

		}

		if (WEB_SOCKET_THROTTLE > 0) {

			broadcastWebSocketMessagesThrottle.push(message);
			return;

		}

		message = JSON.stringify(message);

	}

	this.webSocketServer.clients.forEach((client) => {
		client.send(message, handleBroadcastWebSocketError);
	});

};


//register a node
Xible.prototype.addNode = function(name, obj, constructorFunction) {

	if (!name || !obj || (!constructorFunction && !obj.constructorFunction)) {
		throw new Error('first argument needs to be string, second object, third a constructor function');
	}

	//check if a similar node with the same name doesn't already exist
	if (this.nodes[name]) {
		return this.nodes[name];
	}

	if (!obj.name) {
		obj.name = name;
	}

	if (!obj.constructorFunction) {
		obj.constructorFunction = constructorFunction;
	}

	return (this.nodes[name] = obj);

};


Xible.prototype.getNodes = function() {
	return this.nodes;
};


Xible.prototype.getNodeByName = function(name) {
	return this.nodes[name];
};


Xible.prototype.addFlow = function(flow, callback) {
	this.flows[flow._id] = flow;

	if (typeof callback === 'function') {
		callback(flow);
	}

};


Xible.prototype.getFlows = function(callback) {

	if (typeof callback === 'function') {
		callback(this.flows);
	}

	return this.flows;

};


Xible.prototype.getFlowById = function(id, callback) {

	if (typeof callback === 'function') {
		callback(this.flows[id]);
	}

	return this.flows[id];

};


Xible.prototype.getFlowByName = function(name, callback) {
	return this.getFlowById(name, callback);
};


Xible.prototype.deleteFlow = function(flow, callback) {

	if (flow._id) {
		delete this.flows[flow._id];
	}

	if (typeof callback === 'function') {
		callback();
	}

};


Xible.prototype.deleteFlowById = function(id, callback) {

	if (id) {
		delete this.flows[id];
	}

	if (typeof callback === 'function') {
		callback();
	}

};


Xible.prototype.getNodeConstructorByName = function(name) {
	return this.nodes[name].constructorFunction;
};
