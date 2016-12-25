module.exports = function(XIBLE) {

	function constr(NODE) {

		let numberIn = NODE.addInput('number', {
			type: "math.number"
		});

		let resultOut = NODE.addOutput('result', {
			type: "math.number"
		});

		resultOut.on('trigger', (conn, state, callback) => {

			numberIn.getValues(state).then((numbers) => {

				//take all aNumbers minus the min and output them
				callback(numbers.map((number) => Math.abs(number)));

			});

		});

	}

	XIBLE.addNode('math.absolute', {
		type: "object",
		level: 0,
		description: `Returns the absolute value of a number.`
	}, constr);

};
