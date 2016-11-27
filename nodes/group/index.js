module.exports = function(FLUX) {

	function constr(NODE) {

		let anyIn = NODE.addInput('any', {
			singleType: true
		});

		anyIn.on('editorAttach', function(connector) {

			let type = connector.origin.type;
			this.node.getOutputByName('grouped').setType(type);

		});

		anyIn.on('editorDetach', function(connector) {

			if (!this.connectors.length) {
				this.node.getOutputByName('grouped').setType(null);
			}

		});

		let groupedOut = NODE.addOutput('grouped');

		groupedOut.on('trigger', (conn, state, callback) => {

			NODE.getValuesFromInput(anyIn, state).then((vals) => {
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

	FLUX.addNode('group', {

		type: "object",
		level: 0,
		groups: ["basics"]
	}, constr);

};
