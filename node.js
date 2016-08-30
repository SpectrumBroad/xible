'use strict';

const EventEmitter = require('events').EventEmitter;
const nodeDebug = require('debug')('flux:node');
const path = require('path');

let Node = module.exports = function Node(obj) {

	this.name = obj.name;
	this.type = obj.type; //object, action, trigger (event)
	this.level = obj.level;
	this.groups = obj.groups;
	this.description = obj.description;
	this.editorContent = obj.editorContent;

	this._states = {};

	//init inputs
	this.inputs = {};
	if (obj.inputs) {
		for (const name in obj.inputs) {
			this.addInput(name, obj.inputs[name]);
		}
	}

	//init outputs
	this.outputs = {};
	if (obj.outputs) {
		for (const name in obj.outputs) {
			this.addOutput(name, obj.outputs[name]);
		}
	}

	//construct
	if (obj.constructorFunction) {
		obj.constructorFunction.call(this, this);
	}

};


Node.init = function(Flux) {

	this.Flux = Flux;
	Flux.Node = Flux.prototype.Node = this;

};


//get all installed nodes
const fs = require('fs');
Node.initFromPath = function(path, flux) {

	nodeDebug(`init nodes from ${path}`);

	if (!path || !flux) {
		return;
	}

	Node.nodesPath = path;

	var files = fs.readdirSync(path);
	files.forEach((file) => {

		var filepath = path + '/' + file;
		var node;

		if (fs.statSync(filepath).isDirectory()) {

			try {

				node = require(filepath);
				if (typeof node === 'function') {
					node(flux);
				}

			} catch (e) {
				nodeDebug(`could not init '${file}': ${e.stack}`);
			}

		}

	});

};


Object.setPrototypeOf(Node.prototype, EventEmitter.prototype);


Node.prototype.addInput = function(name, input) {

	if (!(input instanceof NodeInput)) {
		input = new NodeInput(input);
	}

	input.name = name;
	input.node = this;
	this.inputs[name] = input;

	return input;

};


Node.prototype.addOutput = function(name, output) {

	if (!(output instanceof NodeOutput)) {
		output = new NodeOutput(output);
	}

	output.name = name;
	output.node = this;
	this.outputs[name] = output;

	return output;

};


Node.prototype.getInputByName = function(name) {
	return this.inputs[name];
};


Node.prototype.getOutputByName = function(name) {
	return this.outputs[name];
};


Node.prototype.addStatus = function(status) {

	status._id = Node.Flux.generateObjectId();

	process.send({
		method: "broadcastWebSocket",
		message: {

			method: "flux.node.addStatus",
			nodeId: this._id,
			status: status

		}

	});

	return status._id;

};


Node.prototype.removeStatusById = function(statusId) {

	process.send({
		method: "broadcastWebSocket",
		message: {

			method: "flux.node.removeStatusById",
			nodeId: this._id,
			status: {
				_id: statusId
			}

		}
	});

};


Node.prototype.removeAllStatuses = function() {

	process.send({
		method: "broadcastWebSocket",
		message: {

			method: "flux.node.removeAllStatuses",
			nodeId: this._id

		}
	});

};


Node.prototype.setTracker = function(status) {

	process.send({
		method: "broadcastWebSocket",
		message: {

			method: "flux.node.setTracker",
			nodeId: this._id,
			status: status

		}
	});

};


//returns wheter or not any of the inputs with a certain type has connectors
Node.prototype.hasConnectedInputsOfType = function(type) {
	return this.inputs.some(input => input.type === type && input.connectors.length);
};


Node.triggerOutputs = function(output, state) {

	this.flowStateCheck(state);

	output.node.emit('triggerout', output);

	output.connectors.forEach(conn => {

		conn.destination.node.emit('trigger');
		conn.destination.emit('trigger', state.split());

	});

};


Node.flowStateCheck=function(state) {

	if (!(state instanceof Node.Flux.FlowState)) {

		let e = new Error(`state should be provided and instance of FlowState`);
		/*
		let resolvedPath=path.resolve(Node.nodesPath);
		console.log(e.stack.split('\n').find((line) => line.indexOf(resolvedPath) > -1));
		*/
		throw e;

	}

	return true;

};


Node.getValuesFromInput = function(input, state) {

	this.flowStateCheck(state);

	return new Promise((resolve, reject) => {

		let values = [];
		let i = 0;
		let connLength = input.connectors.length;

		if (!connLength) {

			resolve([]);
			return;

		}

		input.connectors.forEach(conn => {

			//trigger the input
			conn.origin.emit('trigger', state, (value) => {

				//let everyone know that the trigger is done
				conn.origin.node.emit('triggerdone');

				//we only send arrays between nodes
				//we don't add non existant values
				//we concat everything
				if (typeof value !== 'undefined' && !Array.isArray(value)) {
					value = [value];
				}
				if (typeof value !== 'undefined') {
					values = values.concat(value);
				}

				//all done
				if (++i === connLength) {
					resolve(values);
				}

			});

		});

	});

};


function NodeIo(obj) {

	this.type = null;

	if (obj) {
		this.type = obj.type;
	}

	this.connectors = [];

}


Object.setPrototypeOf(NodeIo.prototype, EventEmitter.prototype);


function NodeInput(obj) {
	NodeIo.apply(this, arguments);
}


Object.setPrototypeOf(NodeInput.prototype, NodeIo.prototype);


function NodeOutput() {
	NodeIo.apply(this, arguments);
}


Object.setPrototypeOf(NodeOutput.prototype, NodeIo.prototype);
