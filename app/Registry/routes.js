module.exports = function(XIBLE_REGISTRY, XIBLE, EXPRESS_APP) {

	//returns a list of online nodes
	EXPRESS_APP.get('/api/registry/nodes', (req, res) => {

		let searchString = req.query.search;
		if (!searchString) {

			XIBLE_REGISTRY.Node
				.getAll()
				.then((nodes) => {
					res.json(nodes);
				})
				.catch((err) => {
					res.status(500).end();
				});

			return;

		}

		XIBLE_REGISTRY.Node
			.search(searchString)
			.then((nodes) => {
				res.json(nodes);
			})
			.catch((err) => {
				res.status(500).end();
			});

	});

	//get a node by a given name
	EXPRESS_APP.param('nodeName', (req, res, next, nodeName) => {

		req.locals.nodeName = nodeName;

		XIBLE_REGISTRY.Node
			.getByName(nodeName)
			.then((node) => {

				req.locals.node = node;
				next();

			})
			.catch((err) => {
				return res.status(404).end();
			});

	});

	EXPRESS_APP.get('/api/registry/nodes/:nodeName', (req, res) => {
		res.json(req.locals.node);
	});

	//install a node
	EXPRESS_APP.patch('/api/registry/nodes/:nodeName/install', (req, res) => {
		req.locals.node.install()
			.then(() => {
				res.end();
			})
			.catch(() => {
				res.status(500).end();
			});
	});

};
