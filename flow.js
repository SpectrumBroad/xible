const flowDebug = require('debug')('flux:flow');
const cluster = require('cluster');
const fs = require('fs');
const path = require('path');


var Flow = module.exports = function Flow(flux, obj) {

	this.nodes = [];
	this.connectors = [];

	if (flux) {

		this.setFlux(flux);

		if (!this._id) {
			this._id = flux.generateObjectId();
		}

		if (obj) {

			if (obj._id) {
				this._id = obj._id;
			} else {
				obj._id = this._id;
			}

			this.initJson(obj);
			this.save();

		}

		flux.addFlow(this);

	}

};


Flow.init = function(Flux) {

	this.Flux = Flux;
	Flux.Flow = Flux.prototype.Flow = this;

};


Flow.initFromPath = function(flowPath, flux) {

	flowDebug(`init flows from ${flowPath}`);

	let flows = [];

	fs.readdirSync(flowPath).forEach((file) => {

		var filepath = flowPath + '/' + file;
		if (fs.statSync(filepath).isFile() && path.extname(filepath) === '.json') {

			let flow = new Flow(flux);
			flow.initJson(JSON.parse(fs.readFileSync(filepath)));
			flows.push(flow);
			flow.start();

		}

	});

	return flows;

};


//set the flux belonging to this flow
Flow.prototype.setFlux = function(flux) {

	if (flux && flux instanceof Flow.Flux) {
		return (this.flux = flux);
	} else {
		throw new Error('flux must be instanceof Flux');
	}

};


//init a flow, including all its nodes and connectors, from a json obj
Flow.prototype.initJson = function(json) {

	flowDebug(`initJson on ${json._id}`);

	if (!this.flux) {
		throw new Error('flux must be set');
	}

	this.json = json;
	this.nodes = [];
	this.connectors = [];

	//get the nodes
	json.nodes.forEach(node => {

		let fluxNode = new this.flux.Node(this.flux.getNodeByName(node.name));
		if (!fluxNode) {
			return;
		}

		fluxNode._id = node._id;
		fluxNode.data = node.data;
		fluxNode.left = node.left;
		fluxNode.top = node.top;

		this.addNode(fluxNode);

		for (let name in node.inputs) {
			fluxNode.inputs[name]._id = node.inputs[name]._id;
		}

		for (let name in node.outputs) {
			fluxNode.outputs[name]._id = node.outputs[name]._id;
		}

	});

	//get the connectors
	json.connectors.forEach(connector => {

		var origin = this.getOutputById(connector.origin);
		var destination = this.getInputById(connector.destination);

		var fluxConnector = {

			origin: origin,
			destination: destination

		};

		origin.connectors.push(fluxConnector);
		destination.connectors.push(fluxConnector);

	});

};


//saves a flow to the configured flows directory
//only works if this is a the master thread
Flow.prototype.save = function(callback) {

	if (cluster.isMaster && this._id) {

		flowDebug(`saving ${this._id}`);
		fs.writeFile(`./flows/${this._id}.json`, JSON.stringify(this.json), callback);

	}

};


//not sure if needed?
Flow.prototype.addConnector = function(conn) {
	this.connectors.push(connector);
};


Flow.prototype.addNode = function(node) {

	node.flow = this;

	//track direct triggers of nodes
	node.prependListener('trigger', function() {

		var d = new Date();
		this._trackerTriggerTime = d.getTime();
		this.setTracker({
			message: 'start @ ' + d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds() + ':' + d.getMilliseconds(),
			timeout: 3000
		});

	});

	//track incoming output triggers
	for (let name in node.outputs) {

		node.outputs[name].prependListener('trigger', function() {

			var d = new Date();
			this._trackerTriggerTime = d.getTime();
			this.node.setTracker({
				message: 'start @ ' + d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds() + ':' + d.getMilliseconds(),
				timeout: 3000
			});

		});

	}


	//track output triggers
	node.prependListener('triggerout', function(output) {

		var d = new Date();
		var diff = d.getTime() - this._trackerTriggerTime;
		this.setTracker({
			message: `triggered '${output.name}' @ ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}:${d.getMilliseconds()} in ${diff}ms`,
			timeout: 3500
		});

	});

	//add and return
	this.nodes.push(node);
	return node;

};


Flow.prototype.getNodeById = function(id) {
	return this.nodes.find(node => node._id === id);
};


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


Flow.prototype.start = function() {

	if (cluster.isMaster) {

		flowDebug('starting flow from master');

		this.worker = cluster.fork();
		this.worker.on('message', message => {

			switch (message.method) {

				case 'init':

					if (this.worker && this.worker.isConnected()) {

						flowDebug('flow/worker has started');

						this.worker.send({
							"method": "start",
							"flow": this.json
						});

					} else {
						flowDebug('flow/worker has started, but no such worker in master');
					}

					break;

				case 'stop':

					this.stop();
					break;

				case 'broadcastWebSocket':

					if (this.flux && this.flux.webSocketServer) {

						this.flux.webSocketServer.clients.forEach(client => {
							client.send(JSON.stringify(message.message));
						});

					}

					break;

			}

		});

		this.worker.on('exit', () => {
			flowDebug(`worker exited`);
		});

		this.worker.on('disconnect', () => {
			flowDebug(`worker disconnected`);
		});


	} else {

		flowDebug('starting flow from worker');

		//init any node that wants to
		this.nodes.forEach(node => {
			node.emit('init');
		});

		//trigger all event objects that are listening
		this.nodes.forEach(node => {
			if (node.type === 'event') {
				node.emit('trigger');
			}
		});

	}

};


Flow.prototype.stop = function() {

	if (cluster.isMaster) {

		if (this.worker && this.worker.isConnected()) {

			flowDebug('stopping flow from master');
			var killTimeout;

			this.worker.on('disconnect', () => {

				clearTimeout(killTimeout);
				flowDebug('worker disconnected from master');
				this.worker.kill();
				this.worker = null;

				//cleanup all open statuses
				this.flux.webSocketServer.clients.forEach(client => {
					client.send('{\"method\":\"flux.removeAllStatuses\"}');
				});

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
				this.flux.webSocketServer.clients.forEach(client => {
					client.send('{\"method\":\"flux.removeAllStatuses\"}');
				});

			}, 5000);

		}

	} else {

		flowDebug('stopping flow from worker');

		//close any node that wants to
		this.nodes.forEach(node => node.emit('close'));

		flowDebug('stopped flow from worker');

	}

};
