module.exports = function(XIBLE) {

	function constr(NODE) {

		let varOut = NODE.addInput('variable', {
			type: 'variable'
		});

		let valueOut = NODE.addOutput('value');

		valueOut.on('trigger', (conn, state, callback) => {

			varOut.getValues(state).then((variables) => {
				callback([].concat(...variables.map((variable) => variable.name)));
			});

		});

	}

	XIBLE.addNode('variable.name', {
		type: "object",
		level: 0,
		description: `Extracts the name from a variable.`
	}, constr);

};
