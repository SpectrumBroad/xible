module.exports = function(XIBLE) {

	function constr(NODE) {

		let anyIn = NODE.addInput('any', {
			singleType: true
		});

		anyIn.on('attach', function(connector) {

			let type = connector.origin.type;
			this.node.getOutputByName('grouped').setType(type);

		});

		anyIn.on('detach', function(connector) {

			if (!this.connectors.length) {
				this.node.getOutputByName('grouped').setType(null);
			}

		});

		let groupedOut = NODE.addOutput('grouped');

		groupedOut.on('trigger', (conn, state, callback) => {

			anyIn.getValues(state).then((vals) => {
				callback(vals);
			});

		});

		let countOut = NODE.addOutput('count', {
			type: "math.number"
		});

		countOut.on('trigger', (conn, state, callback) => {
			callback(anyIn.connectors.length);
		});

	}

	XIBLE.addNode('group', {
		type: "object",
		level: 0,
		description: `Groups multiple input values together.`
	}, constr);

};
