module.exports = function(FLUX) {

	function constr(NODE) {

		let anyIn = NODE.addInput('any');

		anyIn.on('editorAttach', function(connector) {

			var type = connector.origin.type;
			this.setType(type);
			this.node.getOutputByName('grouped').setType(type);

		});

		anyIn.on('editorDetach', function(connector) {

			if (!this.connectors.length) {

				this.setType(null);
				this.node.getOutputByName('grouped').setType(null);

			}

		});

		let groupedOut = NODE.addOutput('grouped');

		groupedOut.on('trigger', (conn, state, callback) => {

			FLUX.Node.getValuesFromInput(anyIn, state).then((vals) => {
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
