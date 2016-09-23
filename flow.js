'use strict';

const debug = require('debug');
const flowDebug = debug('flux:flow');
const cluster = require('cluster');
const fs = require('fs');
const path = require('path');


/**
 *	Constructor for Flow
 *	@constructor
 *	@param	{Object=}	FLUX
 */
var Flow = module.exports = function Flow(FLUX) {

	this.json = null;
	this.nodes = [];
	this.connectors = [];
	this.usage = null;
	this.runnable = true;

	if (FLUX) {

		this.setFlux(FLUX);
		this._id = FLUX.generateObjectId();

	}

};


/**
 *	Flow module initialization function
 *	@static
 *	@param	{Object}	Flux
 */
Flow.init = function(Flux) {

	this.Flux = Flux;
	Flux.Flow = Flux.prototype.Flow = this;
	Flux.FlowState = Flux.FlowState = FlowState;

};


/**
 *	Init flows from a given path.
 *	This will parse all json files except for status.json into flows.
 *	Note that a path cannot be initiated twice because it is used for saveStatuses()
 *	@static
 *	@param	{String}	path
 *	@param	{Object}	flux
 *	@return {Object.<String, Flow>}	list of flows by their _id
 */
Flow.initFromPath = function(flowPath, FLUX) {

	flowDebug(`init flows from ${flowPath}`);

	if (this.flowPath) {

		flowDebug(`cannot init two flow paths. ${this.flowPath} already init`);
		return;

	}

	Flow.flowPath = flowPath;

	//will hold the flows by their _id
	let flows = {};

	//get the files in the flowPath
	fs.readdirSync(flowPath).forEach((file) => {

		let filepath = flowPath + '/' + file;

		//only fetch json files but ignore status.json
		if (file !== 'status.json' && fs.statSync(filepath).isFile() && path.extname(filepath) === '.json') {

			try {

				let json = JSON.parse(fs.readFileSync(filepath));
				if (json._id) {

					let flow = new Flow(FLUX);
					flow.initJson(json);
					flows[flow._id] = flow;

				}

			} catch (e) {
				flowDebug(`could not init '${filepath}': ${e}`);
			}

		}

	});

	//start all flows which had status running before
	let statuses = this.getStatuses();
	for (let flowId in statuses) {
		if (statuses[flowId] && flows[flowId]) {
			flows[flowId].start();
		}
	}

	return flows;

};


/**
 *	get all flow statuses
 *	@static
 *	@return {Object.<String, Boolean>}	statuses
 */
Flow.getStatuses = function() {

	if (!this.flowPath) {
		return;
	}

	let statuses = {};

	try {
		statuses = JSON.parse(fs.readFileSync(`${this.flowPath}/status.json`));
	} catch (err) {
		flowDebug(`${this.flowPath}/status.json cannot be opened: ${err}`);
	}

	return statuses;

};


/**
 *	save statuses
 *	@static
 *	@param	{Object.<String, Boolean>}	statuses
 */
Flow.saveStatuses = function(statuses) {

	if (!this.flowPath) {
		return;
	}

	try {
		fs.writeFileSync(`${this.flowPath}/status.json`, JSON.stringify(statuses));
	} catch (err) {
		flowDebug(`error saving status to file: ${err}`);
	}

};


/**
 *	set the FLUX instance belonging to this flow
 *	@throw	throws if FLUX is not instanceof Flow.Flux
 *	@param	{Object} FLUX
 */
Flow.prototype.setFlux = function(FLUX) {

	if (FLUX && FLUX instanceof Flow.Flux) {
		return (this.flux = FLUX);
	} else {
		throw new Error('FLUX must be instanceof Flux');
	}

};


/**
 *	init a flow, including all its nodes and connectors, from a json obj
 *	@param	{Object}	json
 *	@param	{Boolean}	newFlow	indicates if this is a new flow to be created
 */
Flow.prototype.initJson = function(json, newFlow) {

	flowDebug(`initJson on ${json._id}`);

	if (!this.flux) {
		throw new Error('FLUX must be set');
	}

	if (!newFlow && json._id) {
		this._id = json._id;
	} else {
		json._id = this._id;
	}

	this.json = json;
	this.nodes = [];
	this.connectors = [];
	this.runnable = true;

	//get the nodes
	json.nodes.forEach(node => {

		let nodeConstr = this.flux.getNodeByName(node.name);
		let fluxNode;

		//init a dummy node directly based on the json and ensure the flow is set to unconstructable
		if (!nodeConstr) {

			//throw new Error(`Node '${node.name}' does not exist`);
			flowDebug(`Node '${node.name}' does not exist`);

			fluxNode = new this.flux.Node(node);
			fluxNode.nodeExists = false;
			this.runnable = false;

		} else {

			//init a working node
			fluxNode = new this.flux.Node(nodeConstr);
			if (!fluxNode) {
				throw new Error(`Could not construct node '${node.name}'`);
			}

		}

		fluxNode._id = node._id;
		fluxNode.data = node.data;
		fluxNode.left = node.left;
		fluxNode.top = node.top;

		this.addNode(fluxNode);

		for (let name in node.inputs) {

			if (!fluxNode.inputs[name]) {

				flowDebug(`Node '${node.name}' does not have input '${name}'`);
				//throw new Error(`Node '${node.name}' does not have input '${name}'`);

				fluxNode.addInput(name, node.inputs[name]);

				fluxNode.nodeExists = false;
				this.runnable = false;

			}

			fluxNode.inputs[name]._id = node.inputs[name]._id;

		}

		for (let name in node.outputs) {

			if (!fluxNode.outputs[name]) {

				flowDebug(`Node '${node.name}' does not have output '${name}'`);
				//throw new Error(`Node '${node.name}' does not have output '${name}'`);

				fluxNode.addOutput(name, node.outputs[name]);

				fluxNode.nodeExists = false;
				this.runnable = false;

			}

			fluxNode.outputs[name]._id = node.outputs[name]._id;

		}

	});

	//get the connectors
	json.connectors.forEach(connector => {

		var origin = this.getOutputById(connector.origin);
		if (!origin) {
			throw new Error(`Cannot find output by id '${connector.origin}'`);
		}

		var destination = this.getInputById(connector.destination);
		if (!destination) {
			throw new Error(`Cannot find input by id '${connector.destination}'`);
		}

		var fluxConnector = {

			origin: origin,
			destination: destination

		};

		origin.connectors.push(fluxConnector);
		destination.connectors.push(fluxConnector);

	});

	this.flux.addFlow(this);

};


/**
 *	saves a flow to the configured flows directory
 *	only works if this is a the master thread
 *	@param {Function}	callback
 */
Flow.prototype.save = function(callback) {

	if (cluster.isMaster && this._id && Flow.flowPath) {

		flowDebug(`saving ${this._id}`);
		fs.writeFile(`${Flow.flowPath}/${this._id}.json`, JSON.stringify(this.json), callback);

	}

};


/**
 *	deletes a flow from the configured flows directory
 *	only works if this is a the master thread
 *	@param {Function}	callback
 */
Flow.prototype.delete = function(callback) {

	this.stop();

	if (cluster.isMaster && this._id && Flow.flowPath) {

		flowDebug(`deleting ${this._id}`);
		fs.unlink(`${Flow.flowPath}/${this._id}.json`, callback);

		//update status file
		let statuses = Flow.getStatuses();
		delete statuses[this._id];
		Flow.saveStatuses(statuses);

		//remove from Flux instance
		if(this.flux) {
			delete this.flux.flows[this._id];
		}

	}

};


/*
Flow.prototype.addConnector = function(conn) {
	this.connectors.push(conn);
};
*/


/**
 *	adds a node to a flow
 *	@param	{Node}	node
 *	@return {Node}	node
 */
Flow.prototype.addNode = function(node) {

	node.flow = this;

	//track direct triggers of nodes
	node.prependListener('trigger', () => {

		var d = new Date();
		node._trackerTriggerTime = d.getTime();

		node.setTracker({
			message: 'start @ ' + d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds() + ':' + d.getMilliseconds(),
			timeout: 3000
		});

	});

	//track incoming output triggers
	for (let name in node.outputs) {

		node.outputs[name].prependListener('trigger', () => {

			var d = new Date();
			node._trackerTriggerTime = d.getTime();
			node.setTracker({
				message: 'start @ ' + d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds() + ':' + d.getMilliseconds(),
				timeout: 3000
			});

		});

	}


	//track output triggers
	node.prependListener('triggerout', (output) => {

		if (!output.connectors.length) {
			return;
		}

		let d = new Date();
		let msg;

		if (node._trackerTriggerTime) {

			let diff = d.getTime() - node._trackerTriggerTime;
			msg = `triggered '${output.name}' in ${diff}ms`;

		} else {
			msg = `triggered '${output.name}' @ ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}:${d.getMilliseconds()}`;
		}

		node.setTracker({
			message: msg,
			timeout: 3500
		});

	});

	//add and return
	this.nodes.push(node);
	return node;

};


/**
 *	returns a node from a specific flow by the node._id
 *	@param {Number}	id	the _id of the node the be found
 *	@return {Node}	the found node
 */
Flow.prototype.getNodeById = function(id) {
	return this.nodes.find(node => node._id === id);
};


/**
 *	returns an input for any node by the input._id
 *	@param {Number}	id	the _id of the nodeInput to be found
 *	@return {NodeInput}	the found nodeInput
 */
Flow.prototype.getInputById = function(id) {

	for (let i = 0; i < this.nodes.length; i++) {

		let node = this.nodes[i];
		for (let name in node.inputs) {

			if (node.inputs[name]._id === id) {
				return node.inputs[name];
			}

		}

	}

};


/**
 *	returns an output for any node by the output._id
 *	@param {Number}	id	the _id of the nodeOutput to be found
 *	@return {NodeOutput}	the found nodeOutput
 */
Flow.prototype.getOutputById = function(id) {

	for (let i = 0; i < this.nodes.length; i++) {

		let node = this.nodes[i];
		for (let name in node.outputs) {

			if (node.outputs[name]._id === id) {
				return node.outputs[name];
			}

		}

	}

};


/**
 *	saves the status (running or not) for this flow by calling Flow.saveStatuses()
 *	@param	{Boolean}	running	status of the flow
 */
Flow.prototype.saveStatus = function(running) {

	let statuses = Flow.getStatuses();
	statuses[this._id] = !!running;
	Flow.saveStatuses(statuses);

};


/**
 *	Starts a flow. Stops it first if it is already running.
 *	Note that the behaviour is different when called from a worker process
 *	@return {Promise}
 */
Flow.prototype.start = function() {

	if (!this.runnable) {
		return;
	}

	if (cluster.isMaster) {

		return new Promise((resolve, reject) => {

			this.stop().then(() => {

				flowDebug('starting flow from master');

				//save the status
				this.saveStatus(true);

				this.worker = cluster.fork();
				this.worker.on('message', message => {

					switch (message.method) {

						case 'init':

							if (this.worker && this.worker.isConnected()) {

								flowDebug('flow/worker has started');
								resolve();

								this.worker.send({
									"method": "start",
									"flow": this.json
								});

							} else {

								flowDebug('flow/worker has started, but no such worker in master');
								reject(`no such worker in master`);

							}

							break;

						case 'stop':

							this.stop();
							break;

						case 'broadcastWebSocket':

							this.flux.broadcastWebSocket(message.message);
							break;

						case 'usage':

							this.usage = message.usage;

							//broadcast the memory usage
							this.flux.broadcastWebSocket({
								method: 'flux.flow.usage',
								flowId: this._id,
								usage: this.usage
							});

							break;

					}

				});

				this.worker.on('exit', () => {
					flowDebug(`worker exited`);
				});

				this.worker.on('disconnect', () => {
					flowDebug(`worker disconnected`);
				});

			});

		});

	} else {

		flowDebug('starting flow from worker');

		//init any node that wants to
		this.nodes.forEach(node => {
			node.emit('init', new FlowState());
		});

		//trigger all event objects that are listening
		this.nodes.forEach(node => {
			if (node.type === 'event') {
				node.emit('trigger', new FlowState());
			}
		});

	}

};


/**
 *	Stops a flow. Will forcibly kill the flow if it is still running after 5 seconds.
 *	Note that the behaviour is different when called from a worker process.
 *	@return {Promise}
 */
Flow.prototype.stop = function() {

	if (cluster.isMaster) {

		return new Promise((resolve, reject) => {

			this.saveStatus(false);

			if (this.worker && this.worker.isConnected()) {

				flowDebug('stopping flow from master');
				var killTimeout;

				this.worker.on('disconnect', () => {

					clearTimeout(killTimeout);
					flowDebug('worker disconnected from master');

					if (this.worker) {
						this.worker.kill();
					}

					this.worker = null;

					//cleanup all open statuses
					this.flux.broadcastWebSocket('{\"method\":\"flux.removeAllStatuses\"}');

					resolve();

				});

				this.worker.send({
					"method": "stop"
				});
				this.worker.disconnect();

				//forcibly kill after 5 seconds
				killTimeout = setTimeout(() => {

					flowDebug('killing worker from master');
					this.worker.kill('SIGKILL');
					this.worker = null;

					//cleanup all open statuses
					this.flux.broadcastWebSocket('{\"method\":\"flux.removeAllStatuses\"}');

					resolve();

				}, 5000);

			} else {
				resolve();
			}

		});

	} else {

		flowDebug('stopping flow from worker');

		//close any node that wants to
		this.nodes.forEach(node => node.emit('close'));

		flowDebug('stopped flow from worker');

	}

};


/**
 *	Contains a flow state.
 *	@constructor
 *	@class
 *	@param	{Object.<String, Object>}	states
 */
function FlowState(states = {}) {

	/**
	 *	Sets a state for a given node.
	 *	Freezes the object to disallow any future adjustments.
	 *	@param	{Node}	node
	 *	@param	{Object}	obj
	 */
	this.set = function(node, obj) {

		if (!(node instanceof Flow.Flux.Node)) {
			throw new Error('node must be instanceof Node');
		} else if (!(obj instanceof Object)) {
			throw new Error('obj must be instanceof Object');
		}

		Object.freeze(obj);
		states[node._id] = obj;

	};

	/**
	 *	Gets a state for a given node.
	 *	@param	{Node}	node
	 *	@return	{Object}
	 */
	this.get = function(node) {

		if (!(node instanceof Flow.Flux.Node)) {
			throw new Error('node must be instanceof Node');
		}

		return states[node._id];

	};

	/**
	 *	Splits the flowState into a new flowState
	 *	@return	{FlowState}	the new flowState
	 */
	this.split = function() {
		//return new FlowState({...states});
		return new FlowState(Object.assign({}, states));
	};

	Object.freeze(this);

}
