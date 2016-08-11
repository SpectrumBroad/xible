const EventEmitter = require('events').EventEmitter;


//setup debug
const debug = require('debug');


const Node = require('./node.js');
const Flow = require('./flow.js');


const Flux = module.exports = function Flux(obj) {

	this.nodes = {};
	this.flows = {};

	//host the client nodes
	if (obj.expressApp) {
		this.initExpress(obj.expressApp);
	}

	if (obj.webSocketServer) {
		this.initWebSocket(obj.webSocketServer);
	}

	//get all installed nodes
	if (obj.nodesPath) {
		Node.initFromPath(obj.nodesPath, this);
	}

	//get all installed flows
	if (obj.flowsPath) {
		Flow.initFromPath(obj.flowsPath, this);
	}

};


//init requires
Flow.init(Flux);
Node.init(Flux);


Flux.init = function() {

	var f = new Flux({
		expressApp: expressApp,
		path: "app/flux/nodes"
	});

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


Flux.prototype.initExpress = function(expressApp) {

	if (!expressApp) {
		return;
	}

	this.expressApp = expressApp;
	require('./routes.js')(this);

};


Flux.prototype.initWebSocket = function(webSocketServer) {

	if (!webSocketServer) {
		return;
	}

	this.webSocketServer = webSocketServer;

};


//register a node
Flux.prototype.addNode = function(name, obj, constructorFunction) {

	if (!name || !obj || (!constructorFunction && !obj.constructorFunction)) {
		throw new Error('first argument needs to be string, second object, third a function');
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
