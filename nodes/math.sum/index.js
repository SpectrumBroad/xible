module.exports = function(FLUX) {

	function constr(NODE) {

		let valuesIn = NODE.addInput('values', {
			type: "math.number"
		});

		let resultOut = NODE.addOutput('result', {
			type: "math.number"
		});

		resultOut.on('trigger', (state, callback) => {

			FLUX.Node.getValuesFromInput(valuesIn, state).then((numbers) => {

				let result = numbers.reduce((previousValue, currentValue) => previousValue + currentValue);
				callback(result);

			});

		});

	}

	FLUX.addNode('math.sum', {
		type: "object",
		level: 0,
		groups: ["math"]
	}, constr);

};
