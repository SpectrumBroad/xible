'use strict';

const EventEmitter = require('events').EventEmitter;

//setup debug
const debug = require('debug');
const webSocketDebug = debug('xible:webSocket');

//config flags
const WEB_SOCKET_THROTTLE = 100; //<1 === don't throttle
const STAT_INTERVAL = 1000; //a value below the broadcast throttle interval (100) won't have any effect

function handleBroadcastWebSocketError(err) {
	if (err) {
		webSocketDebug(`client websocket send failed: ${err}`);
	}
}

let broadcastWebSocketMessagesThrottle = [];

class Xible extends EventEmitter {

	constructor(obj) {

		super();

		this.child = false;
		if (obj.child) {
			this.child = true;
		}
		this.nodes = {};
		this.flows = {};

		this.configPath = obj.configPath;

		//save statuses so new clients can see statuses that were send earlier than their connection start
		this.persistentWebSocketMessages = {};

		const Config = this.Config = require('./app/Config')(this, this.express, this.expressApp);

		//host the client nodes
		if (!this.child) {

			this.initWeb();

			//load config again so it can host the xpressAp
			this.Config = require('./app/Config')(this, this.express, this.expressApp);
			this.Registry = require('./app/Registry')(this, this.express, this.expressApp);

		}

		//get and load the modules
		Object.assign(this, require('./app/Node')(this, this.express, this.expressApp));
		this.Flow = require('./app/Flow')(this, this.express, this.expressApp);

		//ensure catch all routes are loaded last
		if (this.expressApp) {
			require('./routes.js')(this, this.expressApp);
		}

		this.initStats();

		if (!this.child && WEB_SOCKET_THROTTLE > 0) {

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

	}

	//load nodes and flows
	init(obj) {

		//get all installed nodes
		let nodesPath = this.Config.getValue('nodes.path');
		if (!nodesPath) {
			throw new Error(`need a "nodes.path" in the configuration to load the installed nodes from`);
		}

		return this.Node
			.initFromPath(nodesPath, obj && obj.nodeNames)
			.then(() => {

				//get all installed flows
				if (!obj || !obj.nodeNames) {

					let flowPath = this.Config.getValue('flows.path');
					if (flowPath) {
						this.Flow.initFromPath(flowPath);
					}

				}

			});

	}

	initStats() {

		if (!this.child) {

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

				if (process.connected) {

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

	}

	static getNativeModules() {

		return Object.keys(process.binding('natives')).filter(function(el) {
			return !/^_|^internal|\//.test(el);
		});

	}

	static checkUsedDeps() {
		let depcheck = require('depcheck');
	}

	static generateObjectId() {

		function s4() {
			return Math.floor((1 + Math.random()) * 0x10000)
				.toString(16)
				.substring(1);
		}
		return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
			s4() + '-' + s4() + s4() + s4();

	}

	generateObjectId() {
		return Xible.generateObjectId();
	}

	initWeb() {

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

			});

		});

	}

	setPersistentWebSocketMessage(message) {

		if (!this.persistentWebSocketMessages[message.flowId]) {
			this.persistentWebSocketMessages[message.flowId] = {};
		}

		if (!this.persistentWebSocketMessages[message.flowId][message.nodeId]) {
			this.persistentWebSocketMessages[message.flowId][message.nodeId] = {};
		}

		this.persistentWebSocketMessages[message.flowId][message.nodeId][message.status._id] = message;

	}


	deletePersistentWebSocketMessage(message) {

		if (!this.persistentWebSocketMessages[message.flowId]) {
			return;
		}

		if (!this.persistentWebSocketMessages[message.flowId][message.nodeId]) {
			return;
		}

		delete this.persistentWebSocketMessages[message.flowId][message.nodeId][message.status._id];

	}

	broadcastWebSocket(message) {

		if (!this.webSocketServer) {
			return;
		}

		//throttle any message that's not a string
		if (typeof message !== 'string') {

			//save some messages to replay on new connections
			switch (message.method) {

				case 'xible.node.addStatus': case 'xible.node.setTracker':

					this.setPersistentWebSocketMessage(message);

					if (message.status.timeout) {
						setTimeout(() => {
							this.deletePersistentWebSocketMessage(message);
						}, message.status.timeout);
					}

					break;

				case 'xible.node.updateStatusById':

					let copyMessage = Object.assign({}, message);
					copyMessage.method = 'xible.node.addStatus';
					this.setPersistentWebSocketMessage(copyMessage);

					break;

				case 'xible.node.removeStatusById':
					this.deletePersistentWebSocketMessage(message);
					break;

				case 'xible.node.removeAllStatuses':
					if (this.persistentWebSocketMessages[message.flowId] && this.persistentWebSocketMessages[message.flowId][message.nodeId]) {
						delete this.persistentWebSocketMessages[message.flowId][message.nodeId];
					}
					break;

				case 'xible.flow.removeAllStatuses':
					if (this.persistentWebSocketMessages[message.flowId]) {
						delete this.persistentWebSocketMessages[message.flowId];
					}
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

	}

	addNode(name, obj, constructorFunction) {

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

	}

	getNodes() {
		return this.nodes;
	}

	getNodeByName(name) {
		return this.nodes[name];
	}

	addFlow(flow, callback) {
		this.flows[flow._id] = flow;

		if (typeof callback === 'function') {
			callback(flow);
		}

	}

	getFlows(callback) {

		if (typeof callback === 'function') {
			callback(this.flows);
		}

		return this.flows;

	}

	getFlowById(id, callback) {

		if (typeof callback === 'function') {
			callback(this.flows[id]);
		}

		return this.flows[id];

	}

	getFlowByName(name, callback) {
		return this.getFlowById(name, callback);
	}

	deleteFlow(flow, callback) {

		if (flow._id) {
			delete this.flows[flow._id];
		}

		if (typeof callback === 'function') {
			callback();
		}

	}

	deleteFlowById(id, callback) {

		if (id) {
			delete this.flows[id];
		}

		if (typeof callback === 'function') {
			callback();
		}

	}

}

module.exports = Xible;
