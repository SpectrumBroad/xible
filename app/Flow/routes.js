module.exports = function(FLOW, XIBLE, EXPRESS_APP) {

	//retrieve all flows
	EXPRESS_APP.get('/api/flows', (req, res) => {

		let flows = XIBLE.getFlows();
		let returnFlows = {};

		for (let id in flows) {

			let flow = flows[id];

			returnFlows[id] = {
				_id: id,
				nodes: flow.nodes.map((node) => XIBLE.Node.nodeCopy(node)),
				connectors: flow.json.connectors,
				viewState: flow.json.viewState,
				runnable: flow.runnable,
				running: flow.worker && flow.worker.isConnected()
			};

		}

		res.json(returnFlows);

	});


	//create a new flow
	EXPRESS_APP.post('/api/flows', (req, res) => {

		if (!req.body || !req.body._id) {
			return res.status(400).end();
		}

		var flow = new FLOW();
		flow.initJson(req.body);
		flow.save();

		res.json({
			_id: flow._id
		});

	});


	//get a flow by a given id
	EXPRESS_APP.param('flowId', (req, res, next, id) => {

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
	EXPRESS_APP.patch('/api/flows/:flowId/stop', (req, res) => {

		req.locals.flow.forceStop()
			.then(() => {
				res.end();
			})
			.catch(() => {
				res.status(500).end();
			});

	});


	//start an existing flow
	EXPRESS_APP.patch('/api/flows/:flowId/start', (req, res) => {

		req.locals.flow.forceStart()
			.then(() => {
				res.end();
			})
			.catch((err) => {
				res.status(500).end();
			});

	});


	//run part of a flow directly
	EXPRESS_APP.patch('/api/flows/:flowId/direct', (req, res) => {

		//get the nodes that are allowed to run
		req.locals.flow.direct(req.body);

		//output the flow id
		res.end();

	});


	//run part of a flow directly
	EXPRESS_APP.patch('/api/flows/:flowId/undirect', (req, res) => {

		//get the nodes that are allowed to run
		req.locals.flow.undirect();

		//output the flow id
		res.end();

	});


	//get an existing flow
	EXPRESS_APP.get('/api/flows/:flowId', (req, res) => {

		let returnFlow = {
			_id: req.locals.flow._id,
			nodes: req.locals.flow.nodes.map((node) => XIBLE.Node.nodeCopy(node)),
			connectors: req.locals.flow.json.connectors,
			viewState: req.locals.flow.json.viewState,
			runnable: req.locals.flow.runnable
		};

		res.json(returnFlow);

	});


	//update an existing flow
	EXPRESS_APP.put('/api/flows/:flowId', (req, res) => {

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
	EXPRESS_APP.delete('/api/flows/:flowId', (req, res) => {

		let flow = req.locals.flow;
		flow.forceStop().then(() => {

			flow.delete().then(() => {
				res.end();
			});

		});

	});

};
