module.exports = function(FLUX) {

	function constr(NODE) {

		let numberIn = NODE.addInput('number', {
			type: "math.number"
		});

		let resultOut = NODE.addOutput('result', {
			type: "math.number"
		});

		resultOut.on('trigger', (conn, state, callback) => {

			NODE.getValuesFromInput(numberIn, state).then((numbers) => {

				let result = numbers.map((number) => {
					return Math.round(number);
				});

				callback(result);

			});

		});

	}

	FLUX.addNode('math.round', {
		type: "object",
		level: 0,
		description: `Returns the value of a number rounded to the nearest integer.`
	}, constr);

};
