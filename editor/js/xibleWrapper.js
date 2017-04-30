(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.XibleWrapper = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = function(XIBLE) {

	class Config {

		static getAll() {

			let req = XIBLE.httpBase.request('GET', `http${XIBLE.baseUrl}/api/config`);
			return req.toJson();

		}

		static validatePermissions() {

			let req = XIBLE.httpBase.request('GET', `http${XIBLE.baseUrl}/api/config/validatePermissions`);
			return req.toJson();

		}

		static deleteValue(path) {

			let req = XIBLE.httpBase.request('DELETE', `http${XIBLE.baseUrl}/api/config/value`);
			return req.toJson({
				path: path
			});

		}

		static setValue(path, value) {

			if (['string', 'number', 'boolean', 'date'].indexOf(typeof value) === -1) {
				throw new Error(`Param "value" should be of type "string", "number", "boolean" or "date"`);
			}

			let req = XIBLE.httpBase.request('PUT', `http${XIBLE.baseUrl}/api/config/value`);
			return req.toJson({
				path: path,
				value: value
			});

		}

		static getObjectValueOnPath(obj, path) {

			let pathSplit = path.split('.');
			let sel = obj;

			for (let i = 0; i < pathSplit.length; ++i) {

				let part = pathSplit[i];
				if (sel.hasOwnProperty(part)) {
					sel = sel[part];
				} else {
					return null;
				}

			}

			return sel;

		}

		static getValue(path) {

			return this.getAll()
				.then((config) => this.getObjectValueOnPath(config, path));

		}

	}

	return Config;

};

},{}],2:[function(require,module,exports){
module.exports = function(XIBLE) {

	class Connector {

		constructor(obj) {

			if (obj) {

				Object.assign(this, obj);

				this.origin = null;
				this.destination = null;
				this.setOrigin(obj.origin);
				this.setDestination(obj.destination);

				if (obj.type) {
					this.setType(obj.type);
				}

			}

		}

		setType(type) {
			this.type = type;
		}

		filterDuplicateConnectors(type, end) {

			let otherType = (type === 'origin' ? 'destination' : 'origin');
			end.connectors
				.filter((conn) => conn[otherType] === this[otherType])
				.forEach((conn) => conn.delete());

		}

		setEnd(type, end) {

			//remove from old origin
			let endConnectorIndex;
			if (this[type] && (endConnectorIndex = this[type].connectors.indexOf(this)) > -1) {

				this[type].connectors.splice(endConnectorIndex, 1);
				this[type].emit('detach', this);

			}

			this[type] = end;
			if (!end) {
				return null;
			}

			this.setType(end.type);

			//disallow multiple connectors with same origin and destination
			this.filterDuplicateConnectors(type, end);

			end.connectors.push(this);

			//trigger attachment functions
			end.emit('attach', this);

		}

		setOrigin(origin) {
			this.setEnd('origin', origin);
		}

		setDestination(destination) {
			this.setEnd('destination', destination);
		}

		delete() {

			this.setOrigin(null);
			this.setDestination(null);

		}

	}

	return Connector;

};

},{}],3:[function(require,module,exports){
module.exports = function(XIBLE) {

	const EventEmitter = require('events').EventEmitter;

	const Connector = require('./Connector')(XIBLE);
	const Node = require('./Node')(XIBLE);

	XIBLE.setMaxListeners(0);

	class Flow extends EventEmitter {

		constructor(obj) {

			super();

			this._id = null;
			this.runnable = true;
			this.state = Flow.STATE_STOPPED;

			XIBLE.on('message', (json) => {

				if (json.flowId !== this._id) {
					return;
				}

				switch (json.method) {

					case 'xible.flow.loadJson':
						this.runnable = json.runnable;
						this.emit('loadJson');
						break;

					case 'xible.flow.removeAllStatuses':
						this.removeAllStatuses();
						this.emit('removeAllStatuses');
						break;

					case 'xible.flow.initializing':
						this.state = Flow.STATE_INITIALIZING;
						this.emit('initializing', json);
						break;

					case 'xible.flow.initialized':
						this.state = Flow.STATE_INITIALIZED;
						this.emit('initialized', json);
						break;

					case 'xible.flow.starting':
						this.runnable = true;
						this.state = Flow.STATE_STARTING;
						if (json.directed) {
							this.directed = true;
						} else {
							this.directed = false;
						}
						this.emit('starting', json);
						break;

					case 'xible.flow.started':
						this.runnable = true;
						this.state = Flow.STATE_STARTED;
						if (json.directed) {
							this.directed = true;
						} else {
							this.directed = false;
						}
						this.emit('started', json);
						break;

					case 'xible.flow.stopping':
						this.runnable = true;
						this.state = Flow.STATE_STOPPING;
						this.emit('stopping', json);
						break;

					case 'xible.flow.stopped':
						this.state = Flow.STATE_STOPPED;
						this.emit('stopped', json);
						break;

				}

			});

			if (obj) {
				Object.assign(this, obj);
			}

			this.removeAllListeners();

			//setup viewstate
			this.viewState = {
				left: obj && obj.viewState && obj.viewState.left ? obj.viewState.left : 0,
				top: obj && obj.viewState && obj.viewState.top ? obj.viewState.top : 0,
				zoom: obj && obj.viewState && obj.viewState.zoom ? obj.viewState.zoom : 1,
				backgroundLeft: obj && obj.viewState && obj.viewState.backgroundLeft ? obj.viewState.backgroundLeft : 0,
				backgroundTop: obj && obj.viewState && obj.viewState.backgroundTop ? obj.viewState.backgroundTop : 0
			};

			//setup nodes
			if (obj && obj.nodes) {
				this.initNodes(obj.nodes);
			} else {
				this.nodes = [];
			}

			//setup connectors
			if (obj && obj.connectors) {
				this.initConnectors(obj.connectors);
			} else {
				this.connectors = [];
			}

		}

		initNodes(nodes) {

			this.nodes = [];
			nodes.forEach((node) => this.addNode(new Node(node)));

		}

		initConnectors(connectors) {

			this.connectors = [];
			connectors.forEach((conn) => {

				conn.origin = this.getOutputById(conn.origin);
				conn.destination = this.getInputById(conn.destination);

				this.addConnector(new Connector(conn));

			});

		}

		static validatePermissions() {

			let req = XIBLE.httpBase.request('GET', `http${XIBLE.baseUrl}/api/validateFlowPermissions`);
			return req.toJson();

		}

		static getById(id) {

			let req = XIBLE.httpBase.request('GET', `http${XIBLE.baseUrl}/api/flows/${encodeURIComponent(id)}`);
			return req.toObject(Flow);

		}

		static getAll() {

			let req = XIBLE.httpBase.request('GET', `http${XIBLE.baseUrl}/api/flows`);
			return req.toObject(Object).then((flows) => {

				Object.keys(flows).forEach((flowId) => {
					flows[flowId] = new Flow(flows[flowId]);
				});

				return flows;

			});

		}

		static get STATE_STOPPED() {
			return 0;
		}

		static get STATE_STOPPING() {
			return 1;
		}

		static get STATE_INITIALIZING() {
			return 2;
		}

		static get STATE_INITIALIZED() {
			return 3;
		}

		static get STATE_STARTING() {
			return 4;
		}

		static get STATE_STARTED() {
			return 5;
		}

		stop() {

			this.undirect();

			if (!this._id) {
				return Promise.reject(`no id`);
			}

			let req = XIBLE.httpBase.request('PATCH', `http${XIBLE.baseUrl}/api/flows/${encodeURIComponent(this._id)}/stop`);
			this.emit('stop');

			return req.send();

		}

		start() {

			this.undirect();

			if (!this._id) {
				return Promise.reject(`no id`);
			}

			let req = XIBLE.httpBase.request('PATCH', `http${XIBLE.baseUrl}/api/flows/${encodeURIComponent(this._id)}/start`);
			this.emit('start');

			return req.send();

		}

		delete() {

			this.undirect();

			if (!this._id) {
				return;
			}

			let req = XIBLE.httpBase.request('DELETE', `http${XIBLE.baseUrl}/api/flows/${encodeURIComponent(this._id)}`);
			this.emit('delete');

			return req.send();

		}

		save(asNew) {

			this.undirect();

			return new Promise((resolve, reject) => {

				let json = this.toJson();
				let req;

				if (!this._id || asNew) {
					req = XIBLE.httpBase.request('POST', `http${XIBLE.baseUrl}/api/flows`);
				} else {
					req = XIBLE.httpBase.request('PUT', `http${XIBLE.baseUrl}/api/flows/${encodeURIComponent(this._id)}`);
				}

				req.toObject(Object, json).then((json) => {

					this._id = json._id;
					resolve(this);
					this.emit('save');

				}).catch((err) => {
					reject(err);
				});

			});

		}

		undirect() {
			this.emit('undirect');
		}

		direct(related) {

			//throttle
			if (this._lastPostDirectFunction || this._lastDirectPromise) {

				let hasFunction = !!this._lastPostDirectFunction;

				this._lastPostDirectFunction = () => {

					this.direct(related);
					this._lastPostDirectFunction = null;

				};

				if (!hasFunction) {
					this._lastDirectPromise.then(this._lastPostDirectFunction);
				}

				return;

			}

			//ensure this flow is saved first
			if (!this._id) {
				return this.save().then(() => this.direct(related));
			}

			if (!related) {
				return Promise.reject(`related argument missing`);
			}

			this._lastDirectPromise = new Promise((resolve, reject) => {

				let nodes = related.nodes.map((node) => {
					return {
						_id: node._id,
						data: node.data
					};
				});

				let req = XIBLE.httpBase.request('PATCH', `http${XIBLE.baseUrl}/api/flows/${encodeURIComponent(this._id)}/direct`);
				req.toString(nodes).then((json) => {

					resolve(this);
					this._lastDirectPromise = null;

					this.emit('direct');

				}).catch((err) => {
					reject(err);
				});

			});

			return this._lastDirectPromise;

		}

		//TODO: this functions isn't 'pretty'
		//more importantly, it can't handle nodes with io's named 'data'
		toJson(nodes, connectors) {

			//the nodes
			const NODE_WHITE_LIST = ['_id', 'name', 'type', 'left', 'top', 'inputs', 'outputs', 'hidden', 'global'];
			var dataObject, inputsObject, outputsObject;
			var nodeJson = JSON.stringify(nodes || this.nodes, function(key, value) {

				switch (key) {

					case 'inputs':

						inputsObject = value;
						return value;

					case 'outputs':

						outputsObject = value;
						return value;

					case 'data':

						if (this !== inputsObject && this !== outputsObject) {

							dataObject = value;
							return value;

						} // jshint ignore: line

					default:

						if (this !== inputsObject && this !== outputsObject && this !== dataObject && key && isNaN(key) && NODE_WHITE_LIST.indexOf(key) === -1) {
							return;
						} else {
							return value;
						}

				}

			});

			//the connectors
			const CONNECTOR_WHITE_LIST = ['_id', 'origin', 'destination', 'type', 'hidden'];
			const connectorJson = JSON.stringify(connectors || this.connectors, function(key, value) {

				if (key && isNaN(key) && CONNECTOR_WHITE_LIST.indexOf(key) === -1) {
					return;
				} else if (value && (key === 'origin' || key === 'destination')) {
					return value._id;
				} else {
					return value;
				}

			});

			return `{"_id":${JSON.stringify(this._id)},"nodes":${nodeJson},"connectors":${connectorJson},"viewState":${JSON.stringify(this.viewState)}}`;

		}

		/**
		 *	Sets the viewstate of a flow
		 *	@param {Object}	viewState
		 *	@param {Number}	viewState.left
		 *	@param {Number}	viewState.top
		 *	@param {Number}	viewState.backgroundLeft
		 *	@param {Number}	viewState.backgroundTop
		 *	@param {Number}	viewState.zoom
		 */
		setViewState(viewState) {
			this.viewState = viewState;
		}

		getNodeById(id) {
			return this.nodes.find((node) => node._id === id);
		}

		addConnector(connector) {

			if (connector.flow) {
				throw new Error(`connector already hooked up to other flow`);
			}

			this.connectors.push(connector);
			connector.flow = this;
			return connector;

		}

		deleteConnector(connector) {

			let index = this.connectors.indexOf(connector);
			if (index > -1) {
				this.connectors.splice(index, 1);
			}
			connector.flow = null;

		}

		addNode(node) {

			if (node.flow) {
				throw new Error(`node already hooked up to other flow`);
			}

			this.nodes.push(node);
			node.flow = this;

			return node;

		}

		deleteNode(node) {

			let index = this.nodes.indexOf(node);
			if (index > -1) {
				this.nodes.splice(index, 1);
			}
			node.flow = null;

		}

		getInputById(id) {

			for (let i = 0; i < this.nodes.length; ++i) {

				let node = this.nodes[i];
				for (let name in node.inputs) {

					if (node.inputs[name]._id === id) {
						return node.inputs[name];
					}

				}

			}

		}

		getOutputById(id) {

			for (let i = 0; i < this.nodes.length; ++i) {

				let node = this.nodes[i];
				for (let name in node.outputs) {

					if (node.outputs[name]._id === id) {
						return node.outputs[name];
					}

				}

			}

		}

		/**
		 *	returns an array of all nodes in this flow that contain at least one global output
		 *	@returns	{Node[]}	list of nodes
		 */
		getGlobalNodes() {

			return this.nodes.filter((node) => {
				return node.getOutputs().some((output) => output.global);
			});

		}

		/**
		 *	returns an array of all outputs in this flow that are global
		 *	@returns	{Output[]}	list of nodes
		 */
		getGlobalOutputs() {

			let globalOutputs = [];
			for (let i = 0; i < this.nodes.length; ++i) {
				globalOutputs = globalOutputs.concat(this.nodes[i].getGlobalOutputs());
			}
			return globalOutputs;

		}

		removeAllStatuses() {
			this.nodes.forEach((node) => {
				node.removeAllStatuses();
			});
		}

	}

	return Flow;

};

},{"./Connector":2,"./Node":6,"events":11}],4:[function(require,module,exports){
module.exports = function(XIBLE) {

	const Io = require('./Io.js');

	class Input extends Io {

		constructor() {
			super(...arguments);
		}

		delete() {

			super.delete();

			if (this.node) {
				this.node.deleteInput(this);
			}

		}

	}

	return Input;

};

},{"./Io.js":5}],5:[function(require,module,exports){
module.exports = function(XIBLE) {

	const EventEmitter = require('events').EventEmitter;

	const Input = require('./Input.js');
	const Output = require('./Output.js');

	class Io extends EventEmitter {

		constructor(name, obj) {

			super();

			if (obj) {
				Object.assign(this, obj);
			}

			this.removeAllListeners();

			this.connectors = [];

			if (!this._id) {
				this._id = XIBLE.generateObjectId();
			}

			this.setName(name);

			this.setType(this.type);

			if (typeof this.singleType === 'boolean' && obj.singleType && !this.type) {
				this.setSingleType(this.singleType);
			}

			if (typeof obj.maxConnectors === 'number') {
				this.setMaxConnectors(this.maxConnectors);
			}

			if (this.hidden) {
				this.hide();
			}

			if (this.global) {
				this.setGlobal(true);
			}

		}

		/**
		 * If this is set to true, and type===null,
		 *  it's verified that only one type of connector is hooked up.
		 *  @param {Boolean}  singleType
		 */
		setSingleType(bool) {

			this.singleType = bool;

			//TODO: unhook eventlisteners when changing singleType

			if (this.singleType) {

				this.on('attach', (conn) => {

					let connLoc = conn[this instanceof Input ? 'origin' : 'destination'];
					if (connLoc.type) {
						this.setType(connLoc.type);
					}

				});

				this.on('detach', function() {

					if (!this.connectors.length) {
						this.setType(null);
					}

				});

			}

			this.verifyConnectors();

		}

		setGlobal(global) {

			this.global = global;
			return this;

		}

		setMaxConnectors(max) {

			this.maxConnectors = max;
			this.verifyConnectors();

			return this;

		}

		setType(type) {

			//set new type
			this.type = type;
			this.verifyConnectors();

			return this;

		}

		setName(name) {

			if (!name) {
				throw new Error(`the 'name' argument is missing`);
			}

			this.name = name;
			return this;

		}

		verifyConnectors() {

			//remove connectors if we have too many
			//always removes the latest added conns
			if (typeof this.maxConnectors === 'number') {

				while (this.connectors.length > this.maxConnectors) {
					this.connectors[this.connectors.length - 1].delete();
				}

			}

			//verify type
			let checkPlace = this instanceof Input ? 'origin' : 'destination';
			if (this.type) {

				this.connectors
					.filter((conn) => conn[checkPlace].type && conn[checkPlace].type !== this.type)
					.forEach((conn) => conn.delete());

			}

		}

		hide() {

			this.hidden = true;
			return this;

		}

		unhide() {

			this.hidden = false;
			return this;

		}

		delete() {

			while (this.connectors.length) {
				this.connectors[0].delete();
			}

			if (this.node && this instanceof Input) {
				delete this.node.inputs[this.name];
			}

			if (this.node && this instanceof Output) {
				delete this.node.outputs[this.name];
			}

		}

	}

	return Io;

};

},{"./Input.js":4,"./Output.js":7,"events":11}],6:[function(require,module,exports){
module.exports = function(XIBLE) {

	const EventEmitter = require('events').EventEmitter;

	class Node extends EventEmitter {

		constructor(obj = {}, ignoreData = false) {

			super();

			Object.assign(this, obj);
			this.removeAllListeners();

			if (!this._id) {
				this._id = XIBLE.generateObjectId();
			}

			//copy data
			this.data = null;
			if (obj.data && !ignoreData) {
				this.data = Object.assign({}, obj.data);
			} else {
				this.data = {};
			}

			//add inputs
			this.initInputs(obj.inputs);

			//add outputs
			this.initOutputs(obj.outputs);

			this.setPosition(obj.left, obj.top);

		}

		initInputs(inputs) {

			this.inputs = {};
			if (inputs) {
				for (let name in inputs) {
					this.addInput(new XIBLE.NodeInput(name, inputs[name]));
				}
			}

		}

		initOutputs(outputs) {

			this.outputs = {};
			if (outputs) {
				for (let name in outputs) {
					this.addOutput(new XIBLE.NodeOutput(name, outputs[name]));
				}
			}

		}

		static getAll() {

			let req = XIBLE.httpBase.request('GET', `http${XIBLE.baseUrl}/api/nodes`);
			return req.toJson().then((nodes) => {

				Object.keys(nodes).forEach((nodeName) => {
					nodes[nodeName] = new Node(nodes[nodeName]);
				});

				return nodes;

			});

		}

		static getAllInputObjectNodes(node) {

			let resultNodes = [node];
			let resultConnectors = [];

			let objectInputs = node.getInputs().filter((input) => input.type !== 'trigger');

			let inputObjectNodes = [];
			objectInputs.forEach((objectInput) => {

				resultConnectors.push(...objectInput.connectors);
				objectInput.connectors.forEach((connector) => {

					let objs = Node.getAllInputObjectNodes(connector.origin.node);
					resultNodes.push(...objs.nodes);
					resultConnectors.push(...objs.connectors);

				});

			});

			return {
				'nodes': resultNodes,
				'connectors': resultConnectors
			};

		}

		setData(attr, value) {

			if (typeof value === 'undefined') {
				Object.assign(this.data, attr);
			} else {
				this.data[attr] = value;
			}

			this.emit('setdata', attr, value);
			return this;

		}

		getData(attr) {
			return this.data[attr];
		}

		getEditorContent() {

			let req = XIBLE.httpBase.request('GET', `http${XIBLE.baseUrl}/api/nodes/${encodeURIComponent(this.name)}/editor/index.htm`);
			return req.toString();

		}

		setPosition(left = 0, top = 0) {

			this.left = left;
			this.top = top;

			this.emit('position', this);

		}

		addInput(input) {

			this.addIo(input);
			this.inputs[input.name] = input;

			return input;

		}

		addOutput(output) {

			this.addIo(output);
			this.outputs[output.name] = output;

			return output;

		}

		addIo(child) {

			child.node = this;

			if (!child._id) {
				child._id = XIBLE.generateObjectId();
			}

			child.node = this;
			return child;

		}

		deleteInput(input) {

			delete this.inputs[input.name];
			input.node = null;

			return input;

		}

		deleteOutput(output) {

			delete this.outputs[output.name];
			output.node = null;

			return output;

		}

		delete() {

			for (let name in this.inputs) {
				this.inputs[name].delete();
			}

			for (let name in this.outputs) {
				this.outputs[name].delete();
			}

			if (this.flow) {

				let nodeIndex = this.flow.nodes.indexOf(this);
				if (nodeIndex > -1) {
					this.flow.nodes.splice(nodeIndex, 1);
				}

			}

		}

		getInputByName(name) {
			return this.inputs[name];
		}

		getOutputByName(name) {
			return this.outputs[name];
		}

		getInputs() {

			return Object.keys(this.inputs)
				.map((key) => this.inputs[key]);

		}

		getOutputs() {

			return Object.keys(this.outputs)
				.map((key) => this.outputs[key]);

		}

		getGlobalOutputs() {
			return this.getOutputs().filter((output) => output.global);
		}

		getInputsByType(type = null) {

			let inputs = [];
			for (let name in this.inputs) {
				if (this.inputs[name].type === type) {
					inputs.push(this.inputs[name]);
				}
			}
			return inputs;

		}

		getOutputsByType(type = null) {

			let outputs = [];
			for (let name in this.outputs) {
				if (this.outputs[name].type === type) {
					outputs.push(this.outputs[name]);
				}
			}
			return outputs;

		}

		removeAllStatuses() {
		}

	}

	return Node;

};

},{"events":11}],7:[function(require,module,exports){
module.exports = function(XIBLE) {

	const Io = require('./Io.js');

	class Output extends Io {

		constructor() {
			super(...arguments);
		}

		delete() {

			super.delete();

			if (this.node) {
				this.node.deleteOutput(this);
			}

		}

	}

	return Output;

};

},{"./Io.js":5}],8:[function(require,module,exports){
module.exports = function(XIBLE) {

	class Registry {

		static searchNodePacks(searchString) {

			let req = XIBLE.httpBase.request('GET', `http${XIBLE.baseUrl}/api/registry/nodepacks?search=${encodeURIComponent(searchString)}`);
			return req.toJson();

		}

		static installNodePackByName(nodePackName) {

			let req = XIBLE.httpBase.request('PATCH', `http${XIBLE.baseUrl}/api/registry/nodepacks/${encodeURIComponent(nodePackName)}/install`);
			req.timeout = 120000; //give this a high timeout because installing may take a while
			return req.send();

		}

	}

	return Registry;

};

},{}],9:[function(require,module,exports){
'use strict'; /* jshint ignore: line */

//require a WebSocket module for nodejs
const WebSocket = require('ws');

const OoHttpBase = require('oohttp').Base;
let EventEmitter = require('events').EventEmitter;

class XibleWrapper extends EventEmitter {

	constructor(obj) {

		super();

		//get obj properties we need
		this.secure = typeof obj.secure === 'boolean' ? obj.secure : true;
		this.hostname = obj.hostname;
		this.port = obj.port || 9600;
		this.baseUrl = `${this.secure ? 's' : ''}://${this.hostname}:${this.port}`;

		this.httpBase = new OoHttpBase();

		//token if specified
		if (obj.token) {
			this.setToken(obj.token);
		}

		//default props
		this.readyState = XibleWrapper.STATE_CLOSED;
		this.webSocket = null;
		this.socketServer = null;

		this.Flow = require('./Flow.js')(this);
		this.Node = require('./Node.js')(this);
		this.NodeIo = require('./Io.js')(this);
		this.NodeInput = require('./Input.js')(this);
		this.NodeOutput = require('./Output.js')(this);
		this.Connector = require('./Connector.js')(this);
		this.Config = require('./Config.js')(this);
		this.Registry = require('./Registry.js')(this);

	}

	static get STATE_CONNECTING() {
		return 0;
	}

	static get STATE_OPEN() {
		return 1;
	}

	static get STATE_CLOSING() {
		return 2;
	}

	static get STATE_CLOSED() {
		return 3;
	}

	generateObjectId() {

		function s4() {
			return Math.floor((1 + Math.random()) * 0x10000)
				.toString(16)
				.substring(1);
		}
		return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
			s4() + '-' + s4() + s4() + s4();

	}

	setToken(token) {

		this.token = token;
		this.httpBase.headers['x-access-token'] = this.token;

	}

	getServerDate() {

		let req = this.httpBase.request('GET', `http${this.baseUrl}/api/serverDate`);
		return req.toJson();

	}

	getServerClientDateDifference() {
		return this.getServerDate().then((epoch) => epoch - Date.now());
	}

	getPersistentWebSocketMessages() {

		let req = this.httpBase.request('GET', `http${this.baseUrl}/api/persistentWebSocketMessages`);
		return req.toJson();

	}

	connectSocket() {

		//setup a websocket towards
		let ws = this.webSocket = new WebSocket(`ws${this.baseUrl}/?token=${this.token}`);
		ws.addEventListener('open', (event) => {

			this.readyState = XibleWrapper.STATE_OPEN;
			this.emit('open', event);

		});

		ws.addEventListener('close', (event) => {

			this.readyState = XibleWrapper.STATE_CLOSED;
			this.webSocket = null;
			this.emit('close', event);

		});

		ws.addEventListener('error', (event) => {
			this.emit('error', event);
		});

		let messageHandler = (json) => {

			if (json.method !== 'xible.messages') {
				this.emit('message', json);
				return;
			}

			json.messages.forEach((message) => {
				messageHandler(message);
			});

		}

		ws.addEventListener('message', (event) => {

			let json;
			try {

				/**
				 *  Parses event.data from the message to JSON and emits the resulting object
				 *  @event XibleWrapper#json
				 *  @type {Object}
				 */
				json = JSON.parse(event.data);
			} catch (err) {}

			if (!json) {
				return;
			}

			messageHandler(json);

		});

	}

	connect() {

		if (this.readyState !== XibleWrapper.STATE_CLOSED) {
			throw `Cannot connect; not in a closed state`;
		}

		this.readyState = XibleWrapper.STATE_CONNECTING;
		this.connectSocket();

	}

	close() {

		if (this.readyState !== XibleWrapper.STATE_OPEN) {
			throw `Cannot connect; not in a open state`;
		}

		this.readyState = XibleWrapper.STATE_CLOSING;

		this.stopAutoReconnect();

		if (this.webSocket) {
			return new Promise((resolve, reject) => {

				this.webSocket.once('close', () => {
					resolve(this);
				});

				this.webSocket.close();

			});

		} else {
			return Promise.resolve(this);
		}

	}

	/**
	 *  This method will force an automatic reconnect of the socket every <timeout> after a close event
	 *  @param {Number} timeout the amount of milliseconds after 'close' before retrying
	 */
	autoReconnect(timeout = 5000) {

		this.on('close', this._autoReconnectListener = () => {
			setTimeout(() => {
				if (this.readyState === XibleWrapper.STATE_CLOSED) {
					this.connect();
				}
			}, timeout);
		});

	}

	//if this close is enforced and autoreconnect is on,
	//disable autoreconnect
	stopAutoReconnect(timeout) {

		if (this.autoReconnectListener) {

			this.removeListener('close', this.autoReconnectListener);
			this.autoReconnectListener = null;

		}

	}

}

module.exports = XibleWrapper;

},{"./Config.js":1,"./Connector.js":2,"./Flow.js":3,"./Input.js":4,"./Io.js":5,"./Node.js":6,"./Output.js":7,"./Registry.js":8,"events":11,"oohttp":12,"ws":13}],10:[function(require,module,exports){

},{}],11:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],12:[function(require,module,exports){
'use strict';

// node specific imports required to handle https requests
let https, http, url;
if (typeof window === 'undefined') {

	https = require('https');
	http = require('http');
	url = require('url');

}

/**
 * returns the byte length of an utf-8 encoded string
 * from http://stackoverflow.com/questions/5515869/string-length-in-bytes-in-javascript
 * @param {String} str the string to calculate the byte length of
 * @returns {Number} the bytelength
 */
function utf8ByteLength(str) {

	let s = str.length;
	for (let i = str.length - 1; i >= 0; i--) {

		let code = str.charCodeAt(i);
		if (code > 0x7f && code <= 0x7ff) {
			s++;
		} else if (code > 0x7ff && code <= 0xffff) {
			s += 2;
		}

		//trail surrogate
		if (code >= 0xDC00 && code <= 0xDFFF) {
			i--;
		}

	}

	return s;

}

class Base {

	constructor(obj) {

		this.headers = {};
		this.rejectUnauthorized = null;
		this.timeout = null;
		this.autoContentLength = null;

		if (obj) {
			Object.assign(this, obj);
		}

	}

	request(method, url) {

		let req = new Request(method, url);

		Object.assign(req.headers, this.headers);
		req.rejectUnauthorized = this.rejectUnauthorized;
		req.timeout = this.timeout;
		req.autoContentLength = this.autoContentLength;

		return req;

	}

}

class Request {

	constructor(method, url) {
		this.open(method, url);
	}

	open(method, url) {

		this.method = method;
		this.url = url;
		this.headers = {};

	}

	toObject(Constr, data) {

		return this.send(data).then((data) => {
			return new Constr(JSON.parse(data));
		});

	}

	toObjectArray(Constr, data) {

		return this.send(data).then((data) => {

			let json = JSON.parse(data);
			let arr = [];

			json.forEach((obj) => {
				arr.push(new Constr(obj));
			});

			return arr;

		});

	}

	toString(data) {

		return this.send(data).then((data) => {
			return '' + data;
		});

	}

	toJson(data) {

		return this.send(data).then((data) => {
			return JSON.parse(data);
		});

	}

	sendBrowser(data) {

		return new Promise((resolve, reject) => {

			//setup a xmlhttprequest to handle the http request
			let req = new XMLHttpRequest();
			req.open(this.method || Request.defaults.method, this.url);
			req.timeout = this.timeout || Request.defaults.timeout;

			//set the headers
			let headers = Object.assign({}, Request.defaults.headers, this.headers);
			Object.keys(headers).forEach((headerName) => {

				if (typeof headers[headerName] === 'string' || typeof headers[headerName] === 'number') {
					req.setRequestHeader(headerName, headers[headerName]);
				}

			});

			req.onerror = (event) => {
				reject(event);
			};

			req.ontimeout = (event) => {
				reject(event);
			};

			req.onload = (event) => {

				if (req.status >= 200 && req.status < 300) {
					resolve(req.responseText);
				} else {
					reject({
						statusCode: req.status,
						data: req.responseText
					});
				}

			};

			req.send(data);

		});

	}

	sendNode(data) {

		return new Promise((resolve, reject) => {

			let options = url.parse(this.url);
			options.method = this.method || Request.defaults.method;
			options.headers = Object.assign({}, Request.defaults.headers, this.headers);
			options.rejectUnauthorized = typeof this.rejectUnauthorized === 'boolean' ? this.rejectUnauthorized : Request.defaults.rejectUnauthorized;

			let protocolName = options.protocol.substring(0, options.protocol.length - 1).toLowerCase();
			if (protocolName !== 'http' && protocolName !== 'https') {
				throw new Error(`unsupported protocol "${protocolName}"`);
			}

			let req = (protocolName === 'https' ? https : http).request(options, (res) => {

				res.setEncoding('utf8');
				let data = '';
				res.on('data', (chunk) => {
					data += chunk;
				});

				res.on('end', () => {

					if (res.statusCode >= 200 && res.statusCode < 300) {
						resolve(data);
					} else {
						reject({
							statusCode: res.statusCode,
							data: data
						});
					}

				});

			});

			req.setTimeout(this.timeout || Request.defaults.timeout, () => {

				req.abort();
				reject('timeout');

			});

			req.on('error', (err) => {
				reject(err);
			});

			if (data) {

				req.write(data, () => {
					req.end();
				});

			} else {
				req.end();
			}

		});

	}

	send(data) {

		if (data && typeof data !== 'string') {

			let contentType = this.headers['content-type'] || Request.defaults.headers['content-type'];
			if (contentType === 'application/json') {
				data = JSON.stringify(data);
			} else {

				let dataStr = '';
				for (let name in data) {

					if (dataStr.length) {
						dataStr += '&';
					}
					dataStr += `${encodeURIComponent(name)}=${encodeURIComponent(data[name])}`;

				}
				data = dataStr;

			}

		}

		//auto setting of content-length header
		if (data && !this.headers['content-length'] &&
			((typeof this.autoContentLength !== 'boolean' && Request.defaults.autoContentLength === true) ||
				this.autoContentLength === true)
		) {
			this.headers['content-length'] = utf8ByteLength(data);
		}

		if (typeof window === 'undefined') {
			return this.sendNode(data);
		} else {
			return this.sendBrowser(data);
		}

	}

}

Request.defaults = {
	headers: {
		'content-type': 'application/json'
	},
	method: 'GET',
	timeout: 5000,
	rejectUnauthorized: true,
	autoContentLength: false
};

module.exports = {
	Request: Request,
	Base: Base
};

},{"http":10,"https":10,"url":10}],13:[function(require,module,exports){
(function (global){
module.exports = global.WebSocket;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},[9])(9)
});