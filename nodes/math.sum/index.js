module.exports = function(XIBLE) {

	function constr(NODE) {

		let valuesIn = NODE.addInput('values', {
			type: "math.number"
		});

		let resultOut = NODE.addOutput('result', {
			type: "math.number"
		});

		resultOut.on('trigger', (conn, state, callback) => {

			valuesIn.getValues(state).then((numbers) => {

				let result = numbers.reduce((previousValue, currentValue) => previousValue + currentValue);
				callback(result);

			});

		});

	}

	XIBLE.addNode('math.sum', {
		type: "object",
		level: 0,
		description: `Sums up all given input values.`
	}, constr);

};
