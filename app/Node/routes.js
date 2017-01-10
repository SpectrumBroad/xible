module.exports = function(NODE, XIBLE, EXPRESS_APP) {

	//get all registered nodes
	EXPRESS_APP.get('/api/nodes', (req, res) => {

		let nodes = {};
		for (let nodeName in XIBLE.nodes) {

			let node = new NODE(XIBLE.nodes[nodeName]);
			if (!node) {
				throw new Error(`constructor for node "${nodeName}" is not returning actual node`);
			}

			//add to result
			nodes[nodeName] = NODE.nodeCopy(node);

		}

		res.json(nodes);

	});

	//returns a list of online nodes
	EXPRESS_APP.get('/api/nodes/online', (req, res) => {

		res.json({
			test: {
				description: 'woot'
			},
			blaat: {
				description: 'meuq'
			}
		});

	});

};
