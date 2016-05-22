const flowDebug = require('debug')('flux:flow');

const cluster = require('cluster');

var Flow = module.exports = function Flow(flux, obj) {

	this.nodes = [];
	this.connectors = [];

	if (flux) {

		if (!this._id) {
			this._id = Date.now();
		}

		this.setFlux(flux);
		flux.addFlow(this);

	}

	if (flux && obj) {
		this.initJson(obj);
	}

};


Flow.init = function(Flux) {

	this.Flux = Flux;
	Flux.Flow = Flux.prototype.Flow = this;

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

	if (!this.flux) {
		throw new Error('flux must be set');
	}

	this.json = json;
	this.nodes = [];
	this.connectors = [];

	//get the nodes
	json.nodes.forEach(node => {

		var fluxNodeConstructor = this.flux.getNodeConstructorByName(node.name);
		if (fluxNodeConstructor) {

			var fluxNode = fluxNodeConstructor(this);
			if (!fluxNode) {
				return;
			}

			fluxNode._id = node._id;
			fluxNode.data = node.data;

			this.addNode(fluxNode);

			for (let i = 0; i < node.inputs.length; i++) {
				fluxNode.inputs[i]._id = node.inputs[i]._id;
			}

			for (let i = 0; i < node.outputs.length; i++) {
				fluxNode.outputs[i]._id = node.outputs[i]._id;
			}

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
	node.outputs.forEach(output => {

		output.prependListener('trigger', function() {

			var d = new Date();
			this._trackerTriggerTime = d.getTime();
			this.node.setTracker({
				message: 'start @ ' + d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds() + ':' + d.getMilliseconds(),
				timeout: 3000
			});

		});

	});

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
		for (let i = 0; i < node.inputs.length; i++) {

			if (node.inputs[i]._id === id) {
				return node.inputs[i];
			}

		}

	}

};


Flow.prototype.getOutputById = function(id) {

	for (let i = 0; i < this.nodes.length; i++) {

		let node = this.nodes[i];
		for (let i = 0; i < node.outputs.length; i++) {

			if (node.outputs[i]._id === id) {
				return node.outputs[i];
			}

		}

	}

};


Flow.prototype.start = function() {

	if (cluster.isMaster) {

		flowDebug('starting flow from master');

		this.worker = cluster.fork().on('message', message => {

			switch (message.method) {

				case 'init':

					flowDebug('flow/worker has started');

					this.worker.send({
						"method": "start",
						"flow": this.json
					});

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

	    }, 5000);

		}

		//cleanup all open statuses
		this.flux.webSocketServer.clients.forEach(client => {
			client.send('{\"method\":\"flux.removeAllStatuses\"}');
		});

	} else {

		flowDebug('stopping flow from worker');

		//init any node that wants to
		this.nodes.forEach(node => {
			node.emit('close');
		});

		flowDebug('stopped flow from worker');

	}

};
