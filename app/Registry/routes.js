module.exports = function(XIBLE_REGISTRY, XIBLE, EXPRESS_APP) {

	//returns a list of online nodes
	EXPRESS_APP.get('/api/registry/nodes', (req, res) => {

		let searchString = req.query.searchString;

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
			.searchRegistry(searchString)
			.then((nodes) => {
				res.json(nodes);
			})
			.catch((err) => {
				res.status(500).end();
			});

	});

	//get a flow by a given id
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

		req.locals.node.getTarballUrl().then((tarballUrl) => {

			console.log(`${__dirname}/registryTmp/`);

			//fork an npm to install the registry url
			const fork = require('child_process').spawn;
			const npm = fork(`npm`, ['install', tarballUrl], {
				cwd: `${__dirname}/../../registryTmp/`
			});

			npm.on('error', (err) => {
				res.status(500).end();
			});

			npm.on('exit', (exitCode) => {

				if (exitCode) {
					return res.status(500).end();
				}

				res.end();

			});

			npm.stdout.on('data', (data) => {
				console.log(data.toString());
			});

			npm.stderr.on('data', (data) => {
				console.log(data.toString());
			});

		});

	});

};
