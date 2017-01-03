module.exports = function(XIBLE, expressApp) {

	//redirect to index.htm from root
	expressApp.get('/', (req, res) => {
		res.redirect('/index.htm');
	});


	//TODO: refactor this nodeCopy stuff


	//copies inputs/outputs from node to nodecopy
	function nodeIoCopy(ioName, nodeCopy, node) {

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


	function nodeCopy(node) {

		//copy the node so we can mutate it where need be
		let nodeCopy = Object.assign({}, node);
		delete nodeCopy.flow;
		delete nodeCopy._states;
		delete nodeCopy._events;
		delete nodeCopy._eventsCount;
		delete nodeCopy.vault;

		//attach stringified listeners to the io's
		nodeIoCopy('inputs', nodeCopy, node);
		nodeIoCopy('outputs', nodeCopy, node);

		return nodeCopy;

	}


	//get all registered nodes
	expressApp.get('/api/nodes', (req, res) => {

		let nodes = {};
		for (const NODE_NAME in XIBLE.nodes) {

			let node = new XIBLE.Node(XIBLE.nodes[NODE_NAME]);
			if (!node) {
				throw new Error(`constructor for node "${NODE_NAME}" is not returning actual node`);
			}

			//add to result
			nodes[NODE_NAME] = nodeCopy(node);

		}

		res.json(nodes);

	});


	//returns a list of online nodes
	expressApp.get('/api/nodes/online', (req, res) => {

		res.json({
			test: {
				description: 'woot'
			},
			blaat: {
				description: 'meuq'
			}
		});

	});


	//retrieve all flows
	expressApp.get('/api/flows', (req, res) => {

		let flows = XIBLE.getFlows();
		let returnFlows = {};

		for (let id in flows) {

			let flow = flows[id];

			returnFlows[id] = {
				_id: id,
				nodes: [],
				connectors: flow.json.connectors,
				viewState: flow.json.viewState,
				runnable: flow.runnable,
				running: flow.worker && flow.worker.isConnected()
			};

			flow.nodes.forEach((node) => {
				returnFlows[id].nodes.push(nodeCopy(node));
			});

		}

		res.json(returnFlows);

	});


	//create a new flow
	expressApp.post('/api/flows', (req, res) => {

		if (!req.body) {
			return res.status(400).end();
		}

		var flow = new XIBLE.Flow(XIBLE);
		flow.initJson(req.body, true);
		flow.save();

		res.json({
			_id: flow._id
		});

	});


	//get a flow by a given id
	expressApp.param('flowId', (req, res, next, id) => {

		XIBLE.getFlowById(id, (flow) => {

			if (flow) {

				req.locals.flow = flow;
				next();

			} else {
				res.status(404).end();
			}

		});

	});


	//stop an existing flow
	expressApp.patch('/api/flows/:flowId/stop', (req, res) => {

		req.locals.flow.forceStop()
			.then(() => {
				res.end();
			})
			.catch(() => {
				res.status(500).end();
			});

	});


	//start an existing flow
	expressApp.patch('/api/flows/:flowId/start', (req, res) => {

		req.locals.flow.forceStart()
			.then(() => {
				res.end();
			})
			.catch((err) => {
				res.status(500).end();
			});

	});


	//run part of a flow directly
	expressApp.patch('/api/flows/:flowId/direct', (req, res) => {

		//get the nodes that are allowed to run
		req.locals.flow.direct(req.body);

		//output the flow id
		res.end();

	});


	//run part of a flow directly
	expressApp.patch('/api/flows/:flowId/undirect', (req, res) => {

		//get the nodes that are allowed to run
		req.locals.flow.undirect();

		//output the flow id
		res.end();

	});


	//get an existing flow
	expressApp.get('/api/flows/:flowId', (req, res) => {

		let returnFlow = {
			_id: req.locals.flow._id,
			nodes: [],
			connectors: req.locals.flow.json.connectors,
			viewState: req.locals.flow.json.viewState,
			runnable: req.locals.flow.runnable
		};

		req.locals.flow.nodes.forEach((node) => {
			returnFlow.nodes.push(nodeCopy(node));
		});

		res.json(returnFlow);

	});


	//update an existing flow
	expressApp.put('/api/flows/:flowId', (req, res) => {

		if (!req.body) {
			return res.status(400).end();
		}

		let flow = req.locals.flow;
		flow.forceStop().then(() => {

			//init the newly provided json over the existing flow
			flow.initJson(req.body);

			//save it to file
			flow.save().then(() => {

				//output the flow id
				res.json({
					_id: flow._id
				});

			});

		});

	});


	//delete an existing flow
	expressApp.delete('/api/flows/:flowId', (req, res) => {

		let flow = req.locals.flow;
		flow.forceStop().then(() => {

			flow.delete().then(() => {
				res.end();
			});

		});

	});

};
