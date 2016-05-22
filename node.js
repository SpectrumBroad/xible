var EventEmitter = require('events').EventEmitter;


var Node = module.exports = function Node(obj) {

	this.name = obj.name;
	this.type = obj.type; //object, action, trigger (event)
	this.level = obj.level;
	this.groups = obj.groups;
	this.description = obj.description;

	this.editorContent = obj.editorContent;

	//init inputs
	this.inputs = [];
	if (obj.inputs) {
		obj.inputs.forEach(input => {
			this.addInput(input);
		});
	}

	//init outputs
	this.outputs = [];
	if (obj.outputs) {
		obj.outputs.forEach(output => {
			this.addOutput(output);
		});
	}

};


Node.init = function(Flux) {

	this.Flux = Flux;
	Flux.Node = Flux.prototype.Node = this;

};


Object.setPrototypeOf(Node.prototype, EventEmitter.prototype);


Node.prototype.addInput = function(input) {

	if (!(input instanceof NodeInput)) {
		input = new NodeInput(input);
	}

	input.node = this;
	this.inputs.push(input);

	return input;

};


Node.prototype.addOutput = function(output) {

	if (!(output instanceof NodeOutput)) {
		output = new NodeOutput(output);
	}

	output.node = this;
	this.outputs.push(output);

	return output;

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


Node.triggerOutputs = function(output, msg) {

	output.node.emit('triggerout', output);

	output.connectors.forEach(conn => {

		conn.destination.node.emit('trigger', msg);
		conn.destination.emit('trigger', msg);

	});

};


Node.getValuesFromInput = function(input, callback) {

	var values = [];
	var i = 0;
	var connLength = input.connectors.length;

	if (!connLength) {

		callback([]);
		return;

	}

	input.connectors.forEach(conn => {

		conn.origin.emit('trigger', value => {

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
				callback(values);
			}

		});

	});

};


function NodeIo() {
	this.connectors = [];
}


Object.setPrototypeOf(NodeIo.prototype, EventEmitter.prototype);


function NodeInput(obj) {

	if (obj) {

		Object.setPrototypeOf(obj, NodeInput.prototype);
		NodeIo.call(obj);
		return obj;

	}

}


Object.setPrototypeOf(NodeInput.prototype, NodeIo.prototype);


function NodeOutput(obj) {

	if (obj) {

		Object.setPrototypeOf(obj, NodeOutput.prototype);
		NodeIo.call(obj);
		return obj;

	}

}


Object.setPrototypeOf(NodeOutput.prototype, NodeIo.prototype);
