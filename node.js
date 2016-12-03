const EventEmitter = require('events').EventEmitter;
const nodeDebug = require('debug')('flux:node');
const path = require('path');
const cluster = require('cluster');
const fs = require('fs');

module.exports = function(XIBLE, express, expressApp) {

	class Node extends EventEmitter {

		constructor(obj) {

			super();

			this.name = obj.name;
			this.type = obj.type; //object, action, trigger (event)
			this.level = obj.level;
			this.groups = obj.groups;
			this.description = obj.description;
			this.nodeExists = true; //indicates whether this is an existing installed Node
			this.hostsEditorContent = obj.hostsEditorContent; //indicates whether it has a ./editor/index.htm file
			this.top = 0;
			this.left = 0;
			this.flow = null;

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

		}

		static initFromPath(path) {

			nodeDebug(`init nodes from ${path}`);

			if (!path) {
				return;
			}

			Node.nodesPath = path;

			let files = fs.readdirSync(path);
			files.forEach((file) => {

				let filepath = `${path}/${file}`;
				let node;

				if (fs.statSync(filepath).isDirectory()) {

					try {

						node = require(filepath);
						if (typeof node === 'function') {

							node(XIBLE);

							//find client content and host it
							if (cluster.isMaster && XIBLE.nodes[file]) {

								let clientFilePath = `${filepath}/editor`;
								try {

									if (fs.statSync(`${clientFilePath}/index.htm`).isFile()) {

										nodeDebug(`hosting /api/nodes/${file}/editor`);
										expressApp.use(`/api/nodes/${file}/editor`, express.static(clientFilePath, {
											index: false
										}));

										XIBLE.nodes[file].hostsEditorContent = true;

									}

								} catch (e) {}

							}

						}

					} catch (e) {
						nodeDebug(`could not init '${file}': ${e.stack}`);
					}

				}

			});

		}

		addInput(name, input) {

			if (!(input instanceof NodeInput)) {
				input = new NodeInput(input);
			}

			input.name = name;
			input.node = this;
			this.inputs[name] = input;

			return input;

		}

		addOutput(name, output) {

			if (!(output instanceof NodeOutput)) {
				output = new NodeOutput(output);
			}

			output.name = name;
			output.node = this;
			this.outputs[name] = output;

			return output;

		}

		getInputs() {

			let inputs = [];
			for (let name in this.inputs) {
				inputs.push(this.inputs[name]);
			}
			return inputs;

		}


		getOutputs() {

			let outputs = [];
			for (let name in this.outputs) {
				outputs.push(this.outputs[name]);
			}
			return outputs;

		}


		getInputByName(name) {
			return this.inputs[name];
		}


		getOutputByName(name) {
			return this.outputs[name];
		}


		addProgressBar(status) {

			status._id = XIBLE.generateObjectId();

			this.sendProcessMessage({
				method: "broadcastWebSocket",
				message: {

					method: "flux.node.addProgressBar",
					nodeId: this._id,
					status: status

				}

			});

			return status._id;

		}


		sendProcessMessage(obj) {

			if (cluster.worker.isConnected()) {
				process.send(obj);
			}

		}


		updateProgressBarById(statusId, status) {

			status._id = XIBLE.generateObjectId();

			this.sendProcessMessage({
				method: "broadcastWebSocket",
				message: {

					method: "flux.node.updateProgressBarById",
					nodeId: this._id,
					status: {
						_id: statusId,
						percentage: status.percentage
					}

				}
			});

		}


		addStatus(status) {

			status._id = XIBLE.generateObjectId();

			this.sendProcessMessage({
				method: "broadcastWebSocket",
				message: {

					method: "flux.node.addStatus",
					nodeId: this._id,
					status: status

				}

			});

			return status._id;

		}

		removeProgressBarById() {
			this.removeStatusById(...arguments);
		}


		removeStatusById(statusId, timeout) {

			this.sendProcessMessage({
				method: "broadcastWebSocket",
				message: {

					method: "flux.node.removeStatusById",
					nodeId: this._id,
					status: {
						_id: statusId,
						timeout: timeout
					}

				}
			});

		}


		removeAllStatuses() {

			this.sendProcessMessage({
				method: "broadcastWebSocket",
				message: {

					method: "flux.node.removeAllStatuses",
					nodeId: this._id

				}
			});

		}


		setTracker(status) {

			this.sendProcessMessage({
				method: "broadcastWebSocket",
				message: {

					method: "flux.node.setTracker",
					nodeId: this._id,
					status: status

				}
			});

		}


		//returns wheter or not any of the inputs with a certain type has connectors
		hasConnectedInputsOfType(type) {
			return this.inputs.some(input => input.type === type && input.connectors.length);
		}


		triggerOutputs() {
			Node.triggerOutputs(...arguments);
		}


		static triggerOutputs(output, state) {

			this.flowStateCheck(state);

			output.node.emit('triggerout', output);

			output.connectors.forEach(conn => {

				conn.destination.node.emit('trigger');
				conn.destination.emit('trigger', conn, state.split());

			});

		}


		static flowStateCheck(state) {

			if (!(state instanceof XIBLE.FlowState)) {

				let e = new Error(`state should be provided and instance of FlowState`);
				/*
				let resolvedPath=path.resolve(Node.nodesPath);
				console.log(e.stack.split('\n').find((line) => line.indexOf(resolvedPath) > -1));
				*/
				throw e;

			}

			return true;

		}


		getValuesFromInput(input, state) {

			Node.flowStateCheck(state);

			return new Promise((resolve, reject) => {

				let conns = input.connectors;

				//add global outputs as a dummy connector to the connector list
				if (!conns.length) {

					conns = this.flow.getGlobalOutputsByType(input.type).map((output) => ({
						origin: output
					}));

				}

				let connLength = conns.length;
				if (!connLength) {

					resolve([]);
					return;

				}

				let values = [];
				let i = 0;
				conns.forEach((conn) => {

					//trigger the input
					conn.origin.emit('trigger', conn, state, (value) => {

						//let everyone know that the trigger is done
						conn.origin.emit('triggerdone');

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

		}

	}

	//Node.xible = Node.flux = XIBLE;

	return Node;

};


class NodeIo extends EventEmitter {

	constructor(obj) {

		super();

		this.type = null;
		this.singleType = false;
		this.maxConnectors = null;

		if (obj) {

			if (typeof obj.type === 'string') {

				if (obj.type === 'global') {
					throw new TypeError(`you cannot define a input or output with type 'global'`);
				}

				this.type = obj.type;

			}

			if (typeof obj.singleType === 'boolean') {
				this.singleType = obj.singleType;
			}

			if (typeof obj.maxConnectors === 'number') {
				this.maxConnectors = obj.maxConnectors;
			}

		}

		this.connectors = [];

	}

}


class NodeInput extends NodeIo {

	constructor() {
		super(...arguments);
	}

}


class NodeOutput extends NodeIo {

	constructor() {

		super(...arguments);
		this.global = false;

	}

}
