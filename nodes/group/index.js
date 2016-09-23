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

		var groupedOut = NODE.addOutput('grouped');

		groupedOut.on('trigger', (conn, state, callback) => {

			FLUX.Node.getValuesFromInput(anyIn, state).then((vals) => {
				callback(vals);
			});

		});

	}

	FLUX.addNode('group', {

		type: "object",
		level: 0,
		groups: ["basics"]
	}, constr);

};
