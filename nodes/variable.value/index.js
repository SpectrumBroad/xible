module.exports = function(XIBLE) {

	function constr(NODE) {

		let varOut = NODE.addInput('variable', {
			type: 'variable'
		});

		let valueOut = NODE.addOutput('value');

		valueOut.on('trigger', (conn, state, callback) => {

			varOut.getValues(state).then((variables) => {
				callback([].concat(...variables.map((variable) => variable.values)));
			});

		});

	}

	XIBLE.addNode('variable.value', {
		type: "object",
		level: 0,
		description: `Extracts the value from a variable.`
	}, constr);

};
