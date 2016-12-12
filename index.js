'use strict';


//setup debug
const debug = require('debug');
const webSocketDebug = debug('flux:webSocket');
const cluster = require('cluster');


//config flags
const WEB_SOCKET_THROTTLE = 100; //<1 === don't throttle
const STAT_INTERVAL = 1000; //a value below the broadcast throttle interval (100) won't have any effect

const Flux = module.exports = function Flux(obj) {

	const Node = this.Node = require('./Node.js')(this, obj.express, obj.expressApp);
	const Flow = this.Flow = require('./Flow.js')(this, obj.express, obj.expressApp);

	this.nodes = {};
	this.flows = {};

	//host the client nodes
	if (obj.expressApp) {
		this.initExpress(obj.express, obj.expressApp);
	}

	if (obj.webSocketServer) {
		this.initWebSocket(obj.webSocketServer);
	}

	//get all installed nodes
	if (obj.nodesPath) {
		Node.initFromPath(obj.nodesPath, obj.nodeNames);
	}

	//get all installed flows
	if (obj.flowsPath) {
		Flow.initFromPath(obj.flowsPath, this);
	}

	this.initStats();

	if (cluster.isMaster && WEB_SOCKET_THROTTLE > 0) {

		//throttle broadcast messages
		setInterval(() => {

			if (broadcastWebSocketMessagesThrottle.length) {

				let message = JSON.stringify({
					method: 'flux.messages',
					messages: broadcastWebSocketMessagesThrottle
				});
				broadcastWebSocketMessagesThrottle = [];

				this.broadcastWebSocket(message);

			}

		}, WEB_SOCKET_THROTTLE);

	}

};


Flux.prototype.initStats = function() {

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
				method: 'flux.flow.usage',
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


Flux.getNativeModules = function() {

	return Object.keys(process.binding('natives')).filter(function(el) {
		return !/^_|^internal|\//.test(el);
	});

};


Flux.checkUsedDeps = function() {
	let depcheck = require('depcheck');
};


Flux.generateObjectId = Flux.prototype.generateObjectId = function() {

	function s4() {
		return Math.floor((1 + Math.random()) * 0x10000)
			.toString(16)
			.substring(1);
	}
	return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
		s4() + '-' + s4() + s4() + s4();

};


Flux.prototype.initExpress = function(express, expressApp) {

	if (!expressApp) {
		return;
	}

	require('./routes.js')(this, expressApp);

};


Flux.prototype.initWebSocket = function(webSocketServer) {

	if (!webSocketServer) {
		return;
	}

	this.webSocketServer = webSocketServer;

};


function handleBroadcastWebSocketError(err) {
	if (err) {
		webSocketDebug(`client websocket send failed: ${err}`);
	}
}


let broadcastWebSocketMessagesThrottle = [];
Flux.prototype.broadcastWebSocket = function(message) {

	if (!this.webSocketServer) {
		return;
	}

	//throttle any message that's not a string

	if (typeof message !== 'string') {

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
Flux.prototype.addNode = function(name, obj, constructorFunction) {

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


Flux.prototype.getNodes = function() {
	return this.nodes;
};


Flux.prototype.getNodeByName = function(name) {
	return this.nodes[name];
};


Flux.prototype.addFlow = function(flow, callback) {
	this.flows[flow._id] = flow;

	if (typeof callback === 'function') {
		callback(flow);
	}

};


Flux.prototype.getFlows = function(callback) {

	if (typeof callback === 'function') {
		callback(this.flows);
	}

	return this.flows;

};


Flux.prototype.getFlowById = function(id, callback) {

	if (typeof callback === 'function') {
		callback(this.flows[id]);
	}

	return this.flows[id];

};


Flux.prototype.getFlowByName = function(name, callback) {

	//same?
	return this.getFlowById(name, callback);

	//TODO: decide if this can indeed be removed
	let flowId = Object.keys(this.flows).find((flowId) => this.flows[flowId].name === name);
	let flow = null;
	if (flowId) {
		flow = this.flows[flowId];
	}

	if (typeof callback === 'function') {
		callback(flow);
	}

	return flow;

};


Flux.prototype.deleteFlow = function(flow, callback) {

	if (flow._id) {
		delete this.flows[flow._id];
	}

	if (typeof callback === 'function') {
		callback();
	}

};


Flux.prototype.deleteFlowById = function(id, callback) {

	if (id) {
		delete this.flows[id];
	}

	if (typeof callback === 'function') {
		callback();
	}

};


Flux.prototype.getNodeConstructorByName = function(name) {
	return this.nodes[name].constructorFunction;
};
