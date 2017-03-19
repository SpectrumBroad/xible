const EventEmitter = require('events').EventEmitter;
const debug = require('debug');
const nodeDebug = debug('xible:node');
const path = require('path');
const fs = require('fs');

module.exports = function(XIBLE, EXPRESS_APP) {

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
			this.top = obj.top || 0;
			this.left = obj.left || 0;
			this.data = obj.data || {};
			this.flow = null;
			this._id = obj._id;

			this._states = {};

			//init inputs
			this.inputs = {};
			if (obj.inputs) {
				for (let name in obj.inputs) {
					this.addInput(name, obj.inputs[name]);
				}
			}

			//init outputs
			this.outputs = {};
			if (obj.outputs) {
				for (let name in obj.outputs) {
					this.addOutput(name, obj.outputs[name]);
				}
			}

			//vault
			if (this._id) {

				this.vault = new NodeVault(this);

				//add vault data to the data field
				Object.assign(this.data, this.vault.get());

			}

			//construct
			if (obj.constructorFunction) {

				this.constructorFunction = obj.constructorFunction;
				this.constructorFunction.call(this, this);

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

			//attach stringified listeners to the io's
			this.nodeIoCopy('inputs', nodeCopy, node);
			this.nodeIoCopy('outputs', nodeCopy, node);

			return nodeCopy;

		}

		static getStructures(structuresPath, files) {

			if (!Array.isArray(files)) {

				try {
					files = fs.readdirSync(structuresPath);
				} catch (err) {

					nodeDebug(`could not readdir "${structuresPath}": ${err}`);
					files = [];

				}

			}

			return new Promise((resolve, reject) => {

				let structures = {};
				let loadedCounter = 0;

				if (!files.length) {
					resolve(structures);
				}

				function checkAndResolve() {

					if (++loadedCounter === files.length) {
						resolve(structures);
					}

				}

				for (let i = 0; i < files.length; ++i) {

					if (files[i] === 'node_modules' || files[i].substring(0, 1) === '.') {

						checkAndResolve();
						continue;

					}

					let normalizedPath = path.resolve(structuresPath, files[i]);
					fs.stat(normalizedPath, (err, stat) => { /* jshint ignore: line*/

						if (err) {

							nodeDebug(`Could not stat "${normalizedPath}": ${err}`);
							return checkAndResolve();

						}

						if (!stat.isDirectory()) {
							return checkAndResolve();
						}

						this.getStructure(normalizedPath)
							.then((structure) => {

								structures[structure.name] = structure;
								checkAndResolve();

							}).catch((err) => {

								//process subdirs instead
								this.getStructures(normalizedPath)
									.then((nestedStructures) => {

										if (!Object.keys(nestedStructures).length) {

											nodeDebug(err);
											return checkAndResolve();

										}

										Object.assign(structures, nestedStructures);
										checkAndResolve();

									});

							});

					});

				}

			});

		}

		static getStructure(filepath) {

			return new Promise((resolve, reject) => {

				let structure;

				//check for structure.json
				fs.access(`${filepath}/structure.json`, fs.constants.R_OK, (err) => {

					if (err) {
						return reject(`Could not access "${filepath}/structure.json": ${err}`);
					}

					try {

						structure = require(`${filepath}/structure.json`);
						structure.path = filepath;

					} catch (err) {
						return reject(`Could not require "${filepath}/structure.json": ${err}`);
					}

					//check for editor contents
					fs.stat(`${filepath}/editor`, (err, stat) => {

						if (err) {
							return resolve(structure);
						}

						if (stat.isDirectory()) {
							structure.editorContentPath = `${filepath}/editor`;
						}

						return resolve(structure);

					});

				});

			});

		}

		static initFromPath(nodePath, files) {

			nodeDebug(`init nodes from "${nodePath}"`);

			//check that nodePath exists
			if (!fs.existsSync(nodePath)) {

				nodeDebug(`creating "${nodePath}"`);
				fs.mkdirSync(nodePath);

			}

			let EXPRESS;
			if (!XIBLE.child) {
				EXPRESS = require('express');
			}

			return this.getStructures(nodePath, files).then((structures) => {

				for (let nodeName in structures) {

					let structure = structures[nodeName];
					XIBLE.addNode(nodeName, structure);

					//host editor contents if applicable
					if (structure.editorContentPath && !XIBLE.child) {

						structure.hostsEditorContent = true;

						nodeDebug(`hosting "/api/nodes/${nodeName}/editor"`);
						EXPRESS_APP.use(`/api/nodes/${nodeName}/editor`, EXPRESS.static(structure.editorContentPath, {
							index: false
						}));

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

		fail(err, state) {

			if (typeof err !== 'string') {
				throw new Error(`"err" argument of Node.fail(state, err) must be of type "string"`);
			}

			this.setTracker({
				message: err,
				color: 'red',
				timeout: 7000
			});

			if (this.flow) {
				this.flow.emit('fail', this, err, state);
			}

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
					conn.origin.emit('trigger', conn, state, (value) => { /* jshint ignore: line */

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

	//TODO: encryption on the vault
	const vaultDebug = debug('xible:vault');
	let vault;
	let vaultPath = XIBLE.Config.getValue('vault.path');
	if (!vaultPath) {
		throw new Error(`no "vault.path" configured`);
	}
	vaultPath = XIBLE.resolvePath(vaultPath);

	class MainVault {

		static init() {

			//create the vault if it doesn't exist
			if (!fs.existsSync(vaultPath)) {

				vaultDebug(`creating new`);
				fs.writeFileSync(vaultPath, '{}');

			}

			try {
				vault = JSON.parse(fs.readFileSync(vaultPath));
			} catch (err) {
				vaultDebug(`could not open "${vaultPath}"`);
			}

		}

		static save() {

			try {
				fs.writeFileSync(vaultPath, JSON.stringify(vault));
			} catch (e) {
				vaultDebug(`could not save "${vaultPath}"`);
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

			//always get fresh contents
			this.init();

			vault[node._id] = obj;
			this.save();

		}

	}

	class NodeVault {

		constructor(node) {
			this.node = node;
		}

		set(obj) {

			//also update the data property on the node
			Object.assign(this.node.data, obj);
			return MainVault.set(this.node, obj);

		}

		get() {
			return MainVault.get(this.node);
		}

	}

	return {
		Node: Node,
		NodeInput: NodeInput,
		NodeOutput: NodeOutput
	};

};
