module.exports = function(XIBLE) {

	function constr(NODE) {

		let used = false;
		let refreshing = false;
		let variable;

		let valueIn = NODE.addInput('value');

		let variableOut = NODE.addOutput('variable', {
			type: "variable"
		});

		variableOut.on('trigger', (conn, state, callback) => {

			//perform a refresh of all inputs and return those values
			valueIn.getValues(state).then((vals) => {

				callback({
					name: NODE.data.name,
					values: vals
				});

			});

		});

	}

	XIBLE.addNode('variable', {
		type: "object",
		level: 0,
		description: `Represents a named variable.`
	}, constr);

};
