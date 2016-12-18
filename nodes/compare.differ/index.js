module.exports = function(XIBLE) {

	function constr(NODE) {

		let valuesIn = NODE.addInput('values');

		let boolOut = NODE.addOutput('result', {
			type: "boolean"
		});

		boolOut.on('trigger', (conn, state, callback) => {

			valuesIn.getValues(state).then((vals) => {

				if (vals.length) {

					var firstVal = vals[0];
					callback(vals.some((val) => val !== firstVal));

				} else {
					callback(false);
				}

			});

		});

	}

	XIBLE.addNode('compare.differ', {
		type: "object",
		level: 0,
		description: 'Compares all inputs and checks if they differ from eachother.'
	}, constr);

};
