module.exports = function(FLUX) {

	function constr(NODE) {

		let numberIn = NODE.addInput('number', {
			type: "math.number"
		});

		let resultOut = NODE.addOutput('result', {
			type: "math.number"
		});

		resultOut.on('trigger', (conn, state, callback) => {

			NODE.getValuesFromInput(this.node.inputs[0], state).then((numbers) => {

				//take all aNumbers minus the min and output them
				let result = numbers.map((number) => Math.abs(number));

				callback(result);

			});

		});

	}

	FLUX.addNode('math.absolute', {
		type: "object",
		level: 0,
		description: `Returns the absolute value of a number.`
	}, constr);

};
