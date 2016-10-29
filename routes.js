'use strict';

module.exports = function(FLUX) {

	let expressApp = FLUX.expressApp;


	//TODO: refactor this nodeCopy crap


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
				editorAttach: node[ioName][name].listeners('editorAttach').map(fn => fn.toString()),
				editorDetach: node[ioName][name].listeners('editorDetach').map(fn => fn.toString())
			};

		}

	}


	function nodeCopy(node) {

		//copy the node so we can mutate it where need be
		//this does NOT make a deep clone, maybe we should change that
		let nodeCopy = Object.assign({}, node);
		delete nodeCopy.flow;
		delete nodeCopy._states;
		delete nodeCopy._events;
		delete nodeCopy._eventsCount;
		if (node.data) {
			nodeCopy.data = JSON.parse(JSON.stringify(node.data));
		}

		//attach stringified listeners
		nodeCopy.listeners = {
			editorContentLoad: node.listeners('editorContentLoad').map(fn => fn.toString())
		};

		//attach stringified listeners to the io's
		nodeIoCopy('inputs', nodeCopy, node);
		nodeIoCopy('outputs', nodeCopy, node);

		return nodeCopy;

	}


	//get all registered nodes
	expressApp.get('/api/nodes', (req, res) => {

		let nodes = {};
		for (const NODE_NAME in FLUX.nodes) {

			let node = new FLUX.Node(FLUX.nodes[NODE_NAME]);

			if (!node) {
				throw new Error(`constructor for node "${NODE_NAME}" is not returning actual node`);
			}

			//add to result
			nodes[NODE_NAME] = nodeCopy(node);

		}

		res.json(nodes);

	});


	//retrieve all flows
	expressApp.get('/api/flows', (req, res) => {

		let flows = FLUX.getFlows();
		let returnFlows = {};

		for (let id in flows) {

			returnFlows[id] = {
				_id: id,
				nodes: [],
				connectors: flows[id].json.connectors,
				viewState: flows[id].json.viewState,
				runnable: flows[id].runnable
			};

			flows[id].nodes.forEach((node) => {
				returnFlows[id].nodes.push(nodeCopy(node));
			});

		}

		res.json(returnFlows);

	});


	//create a new flow
	expressApp.post('/api/flows', (req, res) => {

		if (!req.body) {
			res.status(400).end();
		} else {

			var flow = new FLUX.Flow(FLUX);
			flow.initJson(req.body, true);
			flow.save();

			res.json({
				_id: flow._id
			});

		}

	});


	//get a flow by a given id
	expressApp.param('flowId', (req, res, next, id) => {

		FLUX.getFlowById(id, (flow) => {

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

		req.locals.flow.stop();
		res.end();

	});


	//start an existing flow
	expressApp.patch('/api/flows/:flowId/start', (req, res) => {

		req.locals.flow.start();
		res.end();

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

		//stop it first
		req.locals.flow.stop();

		//init the newly provided json over the existing flow
		req.locals.flow.initJson(req.body);

		//save it to file
		req.locals.flow.save();

		//output the flow id
		res.json({
			_id: req.locals.flow._id
		});

	});


	//delete an existing flow
	expressApp.delete('/api/flows/:flowId', (req, res) => {

		req.locals.flow.stop();
		req.locals.flow.delete();
		res.end();

	});

};
