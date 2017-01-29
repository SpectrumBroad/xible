const EventEmitter = require('events').EventEmitter;
const debug = require('debug');
const nodeDebug = debug('xible:node');
const path = require('path');
const fs = require('fs');

module.exports = function(XIBLE, EXPRESS, EXPRESS_APP) {

	class Node extends EventEmitter {

		constructor(obj) {

			super();

			this.name = obj.name;
			this.type = obj.type; //object, action, trigger (event)
			this.level = obj.level;
			this.groups = obj.groups;
			this.description = obj.description;
			this.nodeExists = true; //indicates whether this is an existing installed Node (in ./nodes/)
			this.hostsEditorContent = obj.hostsEditorContent; //indicates whether it has a ./editor/index.htm file
			this.top = obj.top || 0;
			this.left = obj.left || 0;
			this.data = obj.data || {};
			this.flow = null;
			this._id = obj._id;

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

			//vault
			if (this._id) {
				this.vault = new NodeVault(this);
			}

			//construct
			if (obj.constructorFunction) {
				obj.constructorFunction.call(this, this);
			}

		}

		//TODO: clean this
		static nodeIoCopy(ioName, nodeCopy, node) {

			nodeCopy[ioName] = {};
			for (let name in node[ioName]) {

				nodeCopy[ioName][name] = Object.assign({}, node[ioName][name]);
				delete nodeCopy[ioName][name].node;
				delete nodeCopy[ioName][name]._events;
				delete nodeCopy[ioName][name]._eventsCount;
				delete nodeCopy[ioName][name].origin;
				delete nodeCopy[ioName][name].destination;
				delete nodeCopy[ioName][name].connectors;

				nodeCopy[ioName][name].listeners = {
					attach: node[ioName][name].listeners('attach').map((fn) => fn.toString()),
					detach: node[ioName][name].listeners('detach').map((fn) => fn.toString())
				};

			}

		}

		//TODO: clean this
		static nodeCopy(node) {

			//copy the node so we can mutate it where need be
			let nodeCopy = Object.assign({}, node);
			delete nodeCopy.flow;
			delete nodeCopy._states;
			delete nodeCopy._events;
			delete nodeCopy._eventsCount;
			delete nodeCopy.vault;

			//add vault data to the data field
			if (node.vault) {
				Object.assign(nodeCopy.data, node.vault.get());
			}

			//attach stringified listeners to the io's
			this.nodeIoCopy('inputs', nodeCopy, node);
			this.nodeIoCopy('outputs', nodeCopy, node);

			return nodeCopy;

		}

		static initFromPath(path, files) {

			return new Promise((resolve, reject) => {

				nodeDebug(`init nodes from "${path}"`);

				if (!path) {
					return;
				}

				Node.nodesPath = path;

				if (!Array.isArray(files)) {
					files = fs.readdirSync(path);
				}

				let loadedCounter = 0;
				for (let i = 0; i < files.length; ++i) {

					let file = files[i];

					let filepath = `${path}/${file}`;
					let node;

					fs.stat(filepath, (err, stat) => {

						if (err) {
							nodeDebug(`could not init '${file}': ${err}`);
						}

						if (!err && stat.isDirectory()) {

							try {

								node = require(`${__dirname}/../../${filepath}`);
								if (typeof node === 'function') {

									node(XIBLE);

									//find client content and host it
									if (!XIBLE.child && XIBLE.nodes[file]) {

										let clientFilePath = `${filepath}/editor`;
										try {

											if (fs.statSync(`${clientFilePath}/index.htm`).isFile()) {

												nodeDebug(`hosting "/api/nodes/${file}/editor"`);
												EXPRESS_APP.use(`/api/nodes/${file}/editor`, EXPRESS.static(clientFilePath, {
													index: false
												}));

												XIBLE.nodes[file].hostsEditorContent = true;

											}

										} catch (err) {}

									}

								}

							} catch (err) {
								nodeDebug(`could not init "${file}": ${err.stack}`);
							}

						}

						if (++loadedCounter === files.length) {
							resolve();
						}

					});

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

			if (!status) {
				throw new Error(`the "status" argument is required`);
			}

			status._id = XIBLE.generateObjectId();

			this.sendProcessMessage({
				method: "broadcastWebSocket",
				message: {

					method: "xible.node.addProgressBar",
					nodeId: this._id,
					flowId: this.flow._id,
					status: status

				}

			});

			return status._id;

		}


		sendProcessMessage(obj) {

			if (process.connected) {
				process.send(obj);
			}

		}


		updateProgressBarById(statusId, status) {

			if (!statusId || !status) {
				throw new Error(`the "statusId" and "status" arguments are required`);
			}

			this.sendProcessMessage({
				method: "broadcastWebSocket",
				message: {

					method: "xible.node.updateProgressBarById",
					nodeId: this._id,
					flowId: this.flow._id,
					status: {
						_id: statusId,
						percentage: status.percentage
					}

				}
			});

			return statusId;

		}


		updateStatusById(statusId, status) {

			if (!statusId || !status) {
				throw new Error(`the "statusId" and "status" arguments are required`);
			}

			this.sendProcessMessage({
				method: "broadcastWebSocket",
				message: {

					method: "xible.node.updateStatusById",
					nodeId: this._id,
					flowId: this.flow._id,
					status: {
						_id: statusId,
						message: status.message,
						color: status.color
					}

				}
			});

			return statusId;

		}


		addStatus(status) {

			if (!status) {
				throw new Error(`the "status" argument is required`);
			}

			status._id = XIBLE.generateObjectId();

			this.sendProcessMessage({
				method: "broadcastWebSocket",
				message: {

					method: "xible.node.addStatus",
					nodeId: this._id,
					flowId: this.flow._id,
					status: status

				}
			});

			return status._id;

		}

		removeProgressBarById() {
			this.removeStatusById(...arguments);
		}


		removeStatusById(statusId, timeout) {

			if (!statusId) {
				throw new Error(`the "statusId" argument is required`);
			}

			this.sendProcessMessage({
				method: "broadcastWebSocket",
				message: {

					method: "xible.node.removeStatusById",
					nodeId: this._id,
					flowId: this.flow._id,
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

					method: "xible.node.removeAllStatuses",
					nodeId: this._id,
					flowId: this.flow._id

				}
			});

		}


		setTracker(status) {

			if (!status) {
				throw new Error(`the "status" argument is required`);
			}

			this.sendProcessMessage({
				method: "broadcastWebSocket",
				message: {

					method: "xible.node.setTracker",
					nodeId: this._id,
					flowId: this.flow._id,
					status: status

				}
			});

		}

		//returns wheter or not any of the inputs with a certain type has connectors
		hasConnectedInputsOfType(type) {
			return this.inputs.some(input => input.type === type && input.connectors.length);
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

	}


	class NodeIo extends EventEmitter {

		constructor(obj) {

			super();

			this.name = null;
			this.type = null;
			this.singleType = false;
			this.maxConnectors = null;
			this.global = false;
			this.node = null;
			this.description = null;

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

				if (typeof obj.global === 'boolean') {
					this.global = obj.global;
				}

				if (typeof obj.description === 'string') {
					this.description = obj.description;
				}

			}

			this.connectors = [];

		}

		isConnected() {

			let conns = this.connectors;

			//check global outputs
			if (!conns.length && this.node && this.node.flow) {

				conns = this.node.flow.getGlobalOutputsByType(this.type).map((output) => ({
					origin: output
				}));

			}

			if (conns.length) {
				return true;
			}

			return false;

		}

	}


	class NodeInput extends NodeIo {

		constructor() {
			super(...arguments);
		}

		getValues(state) {

			Node.flowStateCheck(state);

			return new Promise((resolve, reject) => {

				let conns = this.connectors;

				//add global outputs as a dummy connector to the connector list
				if (!conns.length) {

					conns = this.node.flow.getGlobalOutputsByType(this.type).map((output) => ({
						origin: output
					}));

				}

				let connLength = conns.length;
				if (!connLength) {

					resolve([]);
					return;

				}

				let values = [];
				let callbacksReceived = 0;
				for (let i = 0; i < connLength; i++) {

					let conn = conns[i];

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
						if (++callbacksReceived === connLength) {
							resolve(values);
						}

					});

				}

			});

		}

	}

	class NodeOutput extends NodeIo {

		constructor() {
			super(...arguments);
		}

		trigger(state) {

			Node.flowStateCheck(state);

			this.node.emit('triggerout', this);

			let conns = this.connectors;
			for (let i = 0; i < conns.length; i++) {

				let conn = conns[i];
				conn.destination.node.emit('trigger');
				conn.destination.emit('trigger', conn, state.split());

			}

		}

	}

	if (EXPRESS_APP) {
		require('./routes.js')(Node, XIBLE, EXPRESS_APP);
	}

	return {
		Node: Node,
		NodeInput: NodeInput,
		NodeOutput: NodeOutput
	};

};


//TODO: encryption on the vault
const vaultDebug = debug('xible:vault');
let vault;
class MainVault {

	static init() {

		//create the vault if it doesn't exist
		if (!fs.existsSync(`vault.json`)) {

			vaultDebug(`creating new`);
			fs.writeFileSync(`vault.json`, '{}');

		}

		try {
			vault = JSON.parse(fs.readFileSync(`vault.json`));
		} catch (err) {
			vaultDebug(`could not open vault.json`);
		}

	}

	static save() {

		try {
			fs.writeFileSync(`vault.json`, JSON.stringify(vault));
		} catch (e) {
			vaultDebug(`could not save vault.json`);
		}

	}

	static get(node) {

		if (!node || !node._id) {
			return;
		}

		if (!vault) {
			this.init();
		}

		return vault[node._id];

	}

	static set(node, obj) {

		if (!node || !node._id) {
			return;
		}

		if (!vault) {
			this.init();
		}

		vault[node._id] = obj;
		this.save();

	}

}


class NodeVault {

	constructor(node) {
		this.node = node;
	}

	set(obj) {
		return MainVault.set(this.node, obj);
	}

	get() {
		return MainVault.get(this.node);
	}

}
