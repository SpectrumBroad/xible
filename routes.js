module.exports = function(flux) {

	var expressApp = flux.expressApp;


	//get all registered nodes
	expressApp.get('/api/flux/nodes', (req, res) => {

		var nodes = [];
		for (let name in flux.nodes) {

			let node = flux.nodes[name]();

			if (!node) {
				throw new Error('constructor for node "' + name + '" is not returning actual node');
			}

			//copy the node so we can mutate it where need be
			//this does NOT make a deep clone, maybe we should change that
			var nodeCopy = Object.assign({}, node);
			delete nodeCopy._events;
			delete nodeCopy._eventsCount;

			//attach stringified listeners
			nodeCopy.listeners = {
				editorContentLoad: node.listeners('editorContentLoad').map(fn => fn.toString())
			};

			//attach stringified listeners to the io's
			nodeCopy.inputs = [];
			for (let i = 0; i < node.inputs.length; i++) {

				nodeCopy.inputs[i] = Object.assign({}, node.inputs[i]);
				delete nodeCopy.inputs[i].node;
				delete nodeCopy.inputs[i]._events;
				delete nodeCopy.inputs[i]._eventsCount;

				nodeCopy.inputs[i].listeners = {
					editorAttach: node.inputs[i].listeners('editorAttach').map(fn => fn.toString()),
					editorDetach: node.inputs[i].listeners('editorDetach').map(fn => fn.toString())
				};

			}

			//attach stringified listeners to the io's
			nodeCopy.outputs = [];
			for (let i = 0; i < node.outputs.length; i++) {

				nodeCopy.outputs[i] = Object.assign({}, node.outputs[i]);
				delete nodeCopy.outputs[i].node;
				delete nodeCopy.outputs[i]._events;
				delete nodeCopy.outputs[i]._eventsCount;

				nodeCopy.outputs[i].listeners = {
					editorAttach: node.outputs[i].listeners('editorAttach').map(fn => fn.toString()),
					editorDetach: node.outputs[i].listeners('editorDetach').map(fn => fn.toString())
				};

			}

			//add to result
			nodes.push(nodeCopy);

		}

		res.json(nodes);

	});


	//create a new flow
	expressApp.post('/api/flux/flows', (req, res) => {

		if(!req.body) {
			res.status(400).end();
		} else {

			var flow = new flux.Flow(flux, req.body);
			res.json({
				_id: flow._id
			});

		}

	});


	//get a flow by a given id
	expressApp.param('flowId', function(req, res, next, id) {

		flux.getFlowById(id, function(flow) {

			if (flow) {

				req.locals.flow = flow;
				next();

			} else {
				res.status(404).end();
			}

		});

	});


	//stop an existing flow
	expressApp.patch('/api/flux/flows/:flowId/stop', (req, res) => {

		req.locals.flow.stop();
		res.end();

	});


	//start an existing flow
	expressApp.patch('/api/flux/flows/:flowId/start', (req, res) => {


		req.locals.flow.start();
		res.end();

	});


	//update an existing flow
	expressApp.put('/api/flux/flows/:flowId', (req, res) => {

		//stop it first
		req.locals.flow.stop();

		//init the newly provided json over the existing flow
		req.locals.flow.initJson(req.body);
		res.end();

	});


	//delete an existing flow
	expressApp.delete('/api/flux/flows/:flowId', (req, res) => {

		req.locals.flow.stop();
		req.locals.flow.delete();

	});

};
