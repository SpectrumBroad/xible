'use strict'; /* jshint ignore: line */

const EventEmitter = require('events').EventEmitter;
const os = require('os');

//setup debug
const debug = require('debug');
const xibleDebug = debug('xible');
const webSocketDebug = debug('xible:webSocket');
const expressDebug = debug('xible:express');

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

	constructor(obj, configObj) {

		super();

		this.nodes = {};
		this.flows = {};

		if (typeof obj.configPath === 'string') {
			this.configPath = this.resolvePath(obj.configPath);
		}

		this.child = false;
		if (obj.child) {
			this.child = true;
		}

		if (!this.child) {
			xibleDebug(process.versions);
		}

		this.secure = false;
		this.webPort = null;

		let appNames;
		if (this.child) {
			appNames = ['Config', 'Flow', 'Node'];
		} else {

			this.initWeb();
			this.persistentWebSocketMessages = {};
			appNames = ['Config', 'Flow', 'Node', 'Registry'];

		}

		for (let i = 0; i < appNames.length; ++i) {
			Object.assign(this, require(`./app/${appNames[i]}`)(this, this.expressApp, (appNames[i] === 'Config' && configObj ? configObj : undefined)));
		}

	}

	//load nodes and flows
	init(obj) {

		xibleDebug('init');

		//get all installed nodes
		let nodesPath = this.Config.getValue('nodes.path');
		if (!nodesPath) {
			throw new Error(`need a "nodes.path" in the configuration to load the installed nodes from`);
		}

		if (!this.child) {
			this.startWeb();
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

		if (this.child) {
			return Promise.resolve();
		}

		//ensure catch all routes are loaded last
		if (this.expressApp) {
			require('./routes.js')(this, this.expressApp);
		}

		return Promise.all([
			this.Node.initFromPath(`${__dirname}/nodes`),
			this.Node.initFromPath(this.resolvePath(nodesPath))
		]).then(() => {

			//get all installed flows
			if (!obj || !obj.nodeNames) {

				let flowPath = this.Config.getValue('flows.path');
				if (flowPath) {
					this.Flow.initFromPath(this.resolvePath(flowPath));
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

	resolvePath(path) {
		return path.replace(/^~/, os.homedir());
	}

	static getNativeModules() {

		return Object.keys(process.binding('natives')).filter(function(el) {
			return !/^_|^internal|\//.test(el);
		});

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

	startWeb() {

		xibleDebug('startWeb');

		//setup client requests over https
		const spdy = require('spdy');
		const fs = require('fs');

		const expressApp = this.expressApp;

		//editor
		expressApp.use(this.express.static(`${__dirname}/editor`, {
			index: false
		}));

		//init the webserver
		let webPort = this.webPort = this.Config.getValue('webserver.port') || 9600;
		expressDebug(`starting on port: ${webPort}`);

		let onListen = (webServer) => {

			let address = webServer.address();
			let port = address.port;

			expressDebug(`listening on: ${address.address}:${port}`);

			if (this.secure && port === webPort) {
				return;
			}

			//websocket
			const wsDebug = debug('xible:websocket');
			const ws = require('ws'); //uws is buggy right now

			wsDebug(`listening on port: ${webPort}`);

			const webSocketServer = this.webSocketServer = new ws.Server({
				server: webServer
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

		};

		//spdy (https)
		let keyPath = this.Config.getValue('webserver.keypath');
		let keyCert = this.Config.getValue('webserver.certpath');
		if (keyPath && keyCert) {

			expressDebug(`starting spdy (https)`);
			this.secure = true;

			let secureWebServer = spdy.createServer({
				key: fs.readFileSync(keyPath),
				cert: fs.readFileSync(keyCert)
			}, expressApp).listen(webPort + 1, () => onListen(secureWebServer));

		}

		expressDebug(`starting plain (http)`);
		let plainWebServer = expressApp.listen(webPort, () => onListen(plainWebServer));

	}

	initWeb() {

		xibleDebug('initWeb');

		this.express = require('express');
		this.expressApp = this.express();
		this.expressApp.use(require('body-parser').json());

		//setup default express stuff
		this.expressApp.use((req, res, next) => {

			//check for TLS
			if (this.secure && !req.secure) {

				res.redirect(`https://${req.host}:${this.webPort+1}${req.originalUrl}`);
				return;

			}

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

				case 'xible.node.addStatus':
				case 'xible.node.setTracker':

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

		if (!name || !obj) {
			throw new Error('first argument needs to be string, second object');
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
