const EventEmitter = require('events').EventEmitter;
const debug = require('debug');
const flowDebug = debug('xible:flow');
const cluster = require('cluster');
const fs = require('fs');
const path = require('path');


module.exports = function(XIBLE, express, expressApp) {

	//global output caching
	let globalOutputs = null; //caching
	let expressRes = {}; //res objects for express calls from nodes


	/**
	 *	Flow class
	 */
	class Flow extends EventEmitter {

		constructor() {

			super();

			this.json = null;
			this.nodes = [];
			this.connectors = [];
			this.usage = null;
			this.runnable = true;
			this.directed = false;
			this.starting = this.started = false;
			this.stopping = false;
			this.stopped = true;

			this._id = XIBLE.generateObjectId();

		}

		/**
		 *	Init flows from a given path.
		 *	This will parse all json files except for status.json into flows.
		 *	Note that a path cannot be initiated twice because it is used for saveStatuses()
		 *	@static
		 *	@param	{String}	path
		 *	@param	{Object}	xible
		 *	@return {Object.<String, Flow>}	list of flows by their _id
		 */
		static initFromPath(flowPath, XIBLE) {

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

							let flow = new Flow(XIBLE);
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

		}


		/**
		 *	get all flow statuses
		 *	@static
		 *	@return {Object.<String, Boolean>}	statuses
		 */
		static getStatuses() {

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

		}


		/**
		 *	save statuses
		 *	@static
		 *	@param	{Object.<String, Boolean>}	statuses
		 */
		static saveStatuses(statuses) {

			if (!this.flowPath) {
				return;
			}

			try {
				fs.writeFileSync(`${this.flowPath}/status.json`, JSON.stringify(statuses));
			} catch (err) {
				flowDebug(`error saving status to file: ${err}`);
			}

		}


		/**
		 *	init a flow, including all its nodes and connectors, from a json obj
		 *	@param	{Object}	json
		 *	@param	{Boolean}	newFlow	indicates if this is a new flow to be created
		 */
		initJson(json, newFlow) {

			flowDebug(`initJson on ${json._id}`);

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

				let nodeConstr = XIBLE.getNodeByName(node.name);
				let xibleNode;

				//init a dummy node directly based on the json and ensure the flow is set to unconstructable
				if (!nodeConstr) {

					flowDebug(`Node '${node.name}' does not exist`);

					xibleNode = new XIBLE.Node(node);
					xibleNode.nodeExists = false;
					xibleNode.data = node.data;
					this.runnable = false;

				} else {

					//init a working node
					xibleNode = new XIBLE.Node(Object.assign({}, nodeConstr, {
						_id: node._id,
						data: node.data,
						left: node.left,
						top: node.top
					}));
					if (!xibleNode) {
						throw new Error(`Could not construct node '${node.name}'`);
					}

				}

				this.addNode(xibleNode);

				for (let name in node.inputs) {

					if (!xibleNode.inputs[name]) {

						flowDebug(`Node '${node.name}' does not have input '${name}'`);

						xibleNode.addInput(name, node.inputs[name]);
						xibleNode.nodeExists = false;
						this.runnable = false;

					}

					xibleNode.inputs[name]._id = node.inputs[name]._id;

				}

				for (let name in node.outputs) {

					if (!xibleNode.outputs[name]) {

						flowDebug(`Node '${node.name}' does not have output '${name}'`);

						xibleNode.addOutput(name, node.outputs[name]);
						xibleNode.nodeExists = false;
						this.runnable = false;

					}

					xibleNode.outputs[name]._id = node.outputs[name]._id;
					xibleNode.outputs[name].global = node.outputs[name].global || false;

				}

				//construct a dummy editorContents
				if (!xibleNode.nodeExists) {

					xibleNode.editorContent = '';
					for (let key in xibleNode.data) {
						xibleNode.editorContent += `<input type="text" placeholder="${key}" data-outputvalue="${key}" />`;
					}

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

				var xibleConnector = {

					origin: origin,
					destination: destination

				};

				origin.connectors.push(xibleConnector);
				destination.connectors.push(xibleConnector);

			});

			XIBLE.addFlow(this);

		}


		/**
		 *	saves a flow to the configured flows directory
		 *	only works if this is a the master thread
		 *	@return {Promise}
		 */
		save() {

			return new Promise((resolve, reject) => {

				if (!cluster.isMaster || !this._id || !Flow.flowPath) {

					reject(`not master, no _id or no flowPath specified`);
					return;

				}

				flowDebug(`saving ${this._id}`);
				fs.writeFile(`${Flow.flowPath}/${this._id}.json`, JSON.stringify(this.json), () => {
					resolve(this);
				});

			});

		}


		/**
		 *	deletes a flow from the configured flows directory
		 *	only works if this is a the master thread
		 *	@return {Promise}
		 */
		delete() {

			return new Promise((resolve, reject) => {

				if (!cluster.isMaster || !this._id || !Flow.flowPath) {
					return reject(`not master, no _id or no flowPath specified`);
				}

				if (!this.stopped) {
					return reject(`flow is not stopped`);
				}

				flowDebug(`deleting ${this._id}`);
				fs.unlink(`${Flow.flowPath}/${this._id}.json`, () => {
					resolve(this);
				});

				//update status file
				let statuses = Flow.getStatuses();
				delete statuses[this._id];
				Flow.saveStatuses(statuses);

				//remove from Flux instance
				if (XIBLE) {
					delete XIBLE.flows[this._id];
				}

			});

		}


		/*
		addConnector(conn) {
			this.connectors.push(conn);
		}
		*/


		/**
		 *	adds a node to a flow
		 *	@param	{Node}	node
		 *	@return {Node}	node
		 */
		addNode(node) {

			node.flow = this;

			//track direct triggers of nodes
			node.prependListener('trigger', () => {

				var d = new Date();
				//node._trackerTriggerTime = d.getTime();

				node.setTracker({
					message: 'start @ ' + d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds() + ':' + d.getMilliseconds(),
					timeout: 3000
				});

			});

			//track incoming output triggers
			for (let name in node.outputs) {

				node.outputs[name].prependListener('trigger', () => {

					var d = new Date();
					//node._trackerTriggerTime = d.getTime();
					node.setTracker({
						message: 'start @ ' + d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds() + ':' + d.getMilliseconds(),
						timeout: 3000
					});

				});

			}


			//track output triggers
			/*
			//uncommenting this needs to take care of commented _trackerTriggerTime elsewhere
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
			*/

			//add and return
			this.nodes.push(node);
			return node;

		}


		/**
		 *	returns a node from a specific flow by the node._id
		 *	@param {Number}	id	the _id of the node the be found
		 *	@return {Node}	the found node
		 */
		getNodeById(id) {
			return this.nodes.find(node => node._id === id);
		}


		/**
		 *	returns an input for any node by the input._id
		 *	@param {Number}	id	the _id of the nodeInput to be found
		 *	@return {NodeInput}	the found nodeInput
		 */
		getInputById(id) {

			for (let i = 0; i < this.nodes.length; i++) {

				let node = this.nodes[i];
				for (let name in node.inputs) {

					if (node.inputs[name]._id === id) {
						return node.inputs[name];
					}

				}

			}

		}


		/**
		 *	returns an output for any node by the output._id
		 *	@param {Number}	id	the _id of the nodeOutput to be found
		 *	@return {NodeOutput}	the found nodeOutput
		 */
		getOutputById(id) {

			for (let i = 0; i < this.nodes.length; i++) {

				let node = this.nodes[i];
				for (let name in node.outputs) {

					if (node.outputs[name]._id === id) {
						return node.outputs[name];
					}

				}

			}

		}


		/**
		 *	returns all global outputs with a given type
		 *	@param {String}	type	the type of global outputs to be fetched
		 *	@return {NodeOutput[]}	the global nodeOutputs
		 */
		getGlobalOutputsByType(type) {

			let outputs = [];

			if (globalOutputs) {
				outputs = globalOutputs.filter((globalOutput) => globalOutput.type === type);
			} else {

				globalOutputs = [];
				this.nodes.forEach((node) => {

					for (let name in node.outputs) {

						let output = node.outputs[name];
						if (output.global) {

							globalOutputs.push(output);

							if (output.type === type) {
								outputs.push(output);
							}

						}

					}

				});

			}

			return outputs;

		}


		/**
		 *	saves the status (running or not) for this flow by calling Flow.saveStatuses()
		 *	@param	{Boolean}	running	status of the flow
		 */
		saveStatus(running) {

			let statuses = Flow.getStatuses();
			statuses[this._id] = !!running;
			Flow.saveStatuses(statuses);

		}


		/**
		 *	Starts a flow in direct mode, on a given set of nodes
		 *	@param	{Node[]} nodes	nodes to direct
		 */
		direct(nodes) {

			if (cluster.isMaster) {

				//ensure that the flow is running
				if (this.started && this.directed) {

					this.worker.send({
						"method": "directNodes",
						"directNodes": nodes
					});

				} else {
					this.forceStart(nodes);
				}

			} else {

				//cancel all output triggers
				XIBLE.Node.triggerOutputs = () => {};

				//set the data accordingly
				//init all of them
				//and fetch the action nodes
				let actionNodes = [];
				nodes.forEach((node) => {

					let realNode = this.getNodeById(node._id);
					realNode.data = node.data;

					realNode.emit('init', new FlowState());

					if (realNode.type === 'action') {
						actionNodes.push(realNode);
					}

				});

				//trigger the action nodes
				actionNodes.forEach((node) => {

					node.getInputs().filter((input) => input.type === 'trigger').forEach((input) => {
						input.emit('trigger', null, new FlowState());
					});

				});

			}

		}


		/**
		 *	Starts a flow. Stops the flow first if it is not stopped
		 *	@param	{Node[]} directNodes	nodes to direct
		 *	@return {Promise}
		 */
		forceStart(directNodes) {

			let startFlow = () => {
				return this.start(directNodes);
			};

			if (this.stopped) {
				return startFlow();
			} else if (this.stopping) {

				return new Promise((resolve, reject) => {
					this.once('stopped', () => {

						if (this.stopped) {
							resolve(startFlow());
						} else {
							resolve(this);
						}

					});
				});

			} else if (this.started) {
				return this.stop().then(startFlow);
			} else if (this.starting) {

				return new Promise((resolve, reject) => {
					this.once('started', () => {

						if (this.started) {
							this.stop().then(() => {

								if (this.stopped) {
									resolve(startFlow());
								} else {
									resolve(this);
								}

							});
						} else {
							resolve(this);
						}

					});
				});

			}

		}


		/**
		 *	Starts a flow. Rejects if flow is not stopped
		 *	Note that the behaviour is different when called from a worker process
		 *	@param	{Node[]} directNodes	nodes to direct
		 *	@return {Promise}
		 */
		start(directNodes) {

			if (!this.runnable) {
				return Promise.reject(`not runnable`);
			}

			if (cluster.isMaster) {

				if (!this.stopped) {
					return Promise.reject(`cannot start; flow is not stopped`);
				}

				return new Promise((resolve, reject) => {

					//let client now we're starting up the flow
					this.started = this.stopped = false;
					this.starting = true;
					XIBLE.broadcastWebSocket({
						method: 'xible.flow.starting',
						flowId: this._id
					});

					flowDebug('starting flow from master');

					//save the status
					if (!directNodes) {

						this.saveStatus(true);
						this.directed = false;

					} else {
						this.directed = true;
					}

					this.worker = cluster.fork();
					this.worker.on('message', (message) => {

						let res;

						switch (message.method) {

							case 'init':

								if (this.worker && this.worker.isConnected()) {

									flowDebug('flow/worker has started');
									resolve(this);

									this.starting = this.stopped = false;
									this.started = true;
									this.worker.send({
										"method": "start",
										"flow": this.json,
										"directNodes": directNodes
									});
									this.emit('started');

									XIBLE.broadcastWebSocket({
										method: 'xible.flow.started',
										flowId: this._id
									});

								} else {

									flowDebug('flow/worker has started, but no such worker in master');
									reject(`no such worker in master`);

								}

								break;

							case 'startFlowById':

								let flow = XIBLE.getFlowById(message.flowId);
								if (flow) {

									flow.forceStart().then(() => {
										if (this.worker && this.worker.isConnected()) {
											this.worker.send({
												method: "flowStarted",
												flowId: message.flowId
											});
										}
									});

								} else {

									this.worker.send({
										method: "flowNotExist",
										flowId: message.flowId
									});

								}

								break;

							case 'stop':

								this.stop();
								break;

							case 'broadcastWebSocket':

								XIBLE.broadcastWebSocket(message.message);
								break;

							case 'usage':

								this.usage = message.usage;
								break;

						}

					});

					this.worker.on('exit', () => {

						this.stopping = this.started = this.starting = false;
						this.stopped = true;
						this.worker = null;
						this.usage = null;

						this.emit('stopped');
						XIBLE.broadcastWebSocket({
							method: 'xible.flow.stopped',
							flowId: this._id
						});

						flowDebug(`worker exited`);

					});

					this.worker.on('disconnect', () => {

						flowDebug(`worker disconnected from master`);
						this.usage = null;

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

		}


		/**
		 *	Stops a flow. Will not reject if it's already running
		 *  If the flow is in starting mode, it will stop it after it has finished starting
		 *	@return {Promise}
		 */
		forceStop() {

			let stopFlow = () => {
				return this.stop();
			};

			if (this.started) {
				return stopFlow();
			} else if (this.starting) {

				return new Promise((resolve, reject) => {
					this.once('started', () => {
						resolve(this.started ? stopFlow() : this);
					});
				});

			} else if (this.stopped) {
				return Promise.resolve(this);
			} else if (this.stopping) {

				return new Promise((resolve, reject) => {
					this.once('stopped', () => {
						resolve(this);
					});
				});

			}

		}


		/**
		 *	Stops a flow. Will forcibly kill the flow if it is still running after 5 seconds.
		 *	Note that the behaviour is different when called from a worker process.
		 *	@return {Promise}
		 */
		stop() {

			if (cluster.isMaster) {

				if (!this.started && !this.starting) {
					return Promise.reject(`cannot stop; flow is not started`);
				}

				return new Promise((resolve, reject) => {

					this.saveStatus(false);

					if (this.worker) {

						this.stopping = true;
						XIBLE.broadcastWebSocket({
							method: 'xible.flow.stopping',
							flowId: this._id
						});

						//if the flow is in starting mode, wait for it to finish starting and stop it afterwards
						if (this.starting) {

							flowDebug('stopping flow from master, after start finished');
							this.once('started', () => {

								this.stop().then(() => {
									resolve();
								});

							});

							return;

						}

						flowDebug('stopping flow from master');
						let killTimeout;

						this.worker.once('exit', () => {

							if (killTimeout) {

								clearTimeout(killTimeout);
								killTimeout = null;

							}

							resolve(this);

						});

						this.worker.on('disconnect', () => {

							if (this.worker) {

								flowDebug('killing worker the normal way');
								this.worker.kill();

							} else if (killTimeout) {
								clearTimeout(killTimeout);
								killTimeout = null;
							}

							//cleanup all open statuses
							XIBLE.broadcastWebSocket({
								'method': 'xible.flow.removeAllStatuses',
								'flowId': this._id
							});

						});

						this.worker.send({
							"method": "stop"
						});

						this.worker.disconnect();

						//forcibly kill after 5 seconds
						killTimeout = setTimeout(() => {

							flowDebug('killing worker from master using SIGKILL');
							this.worker.kill('SIGKILL');

							//cleanup all open statuses
							XIBLE.broadcastWebSocket({
								'method': 'xible.flow.removeAllStatuses',
								'flowId': this._id
							});

							killTimeout = null;

						}, 5000);

					} else {
						resolve(this);
					}

				});

			} else {

				flowDebug('stopping flow from worker');

				//close any node that wants to
				this.nodes.forEach((node) => node.emit('close'));

				flowDebug('stopped flow from worker');

				process.exit(0);

			}

		}

	}

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

			if (!(node instanceof XIBLE.Node)) {
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

			if (!(node instanceof XIBLE.Node)) {
				throw new Error('node must be instanceof Node');
			}

			return states[node._id];

		};

		/**
		 *	Splits the flowState into a new flowState
		 *	@return	{FlowState}	the new flowState
		 */
		this.split = function() {
			return new FlowState(Object.assign({}, states));
		};

		Object.freeze(this);

	}

	//Flow.xible = Flow.xible = XIBLE;

	XIBLE.FlowState = FlowState;

	return Flow;

};
