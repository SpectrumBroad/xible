var EventEmitter = require('events').EventEmitter;
var ws = require('ws');
var express = require('express');
var bodyParser = require('body-parser');


//setup debug
var debug = require('debug');
var wsDebug = debug('flux:websocket');


var Flux = module.exports = function Flux(obj) {

	this.nodes = {};
	this.flows = {};

	//host the client nodes
	if(obj.expressApp) {
		this.initExpress(obj.expressApp);
	}

	if(obj.webSocketServer) {
		this.initWebSocket(obj.webSocketServer);
	}

	//get all installed nodes
	if(obj.nodesPath) {
		this.initNodesFromPath(obj.nodesPath);
	}

	//get all installed flows
	//this.initFlowsFromPath(obj.flowsPath);

};


var Flow = require('./flow.js');
Flow.init(Flux);


var Node = require('./node.js');
Node.init(Flux);


Flux.init = function() {

	var f = new Flux({
		expressApp: expressApp,
		path: "app/flux/nodes"
	});

};


Flux.generateObjectId = function() {

	if (!this.uuid) {
		this.uuid = 0;
	}

	return ++this.uuid;

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


//get all installed nodes
var fs = require('fs');
Flux.prototype.initNodesFromPath = function(path) {

	if (!path) {
		return;
	}

	var files = fs.readdirSync(path);
	files.forEach((file) => {

		var filepath = path + '/' + file;
		var node;
		if (fs.statSync(filepath).isFile()) {

			node = require(filepath);
			if (typeof node === 'function') {
				node(this);
			}

		} else {

			node = require(filepath);
			if (typeof node === 'function') {
				node(this);
			}

		}

	});

};


//allow a node to register itself
Flux.prototype.addNode = function(name, fn) {

	if (typeof name !== 'string' || typeof fn !== 'function') {
		throw new Error('first arguments needs to be string, second a function');
	}

	//check if a similar node with the same name doesn't already exist
	if (this.nodes[name]) {
		return this.nodes[name];
	}

	return (this.nodes[name] = fn);

};


Flux.prototype.getNodes = function() {
	return this.nodes;
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
	return this.nodes[name];
};
