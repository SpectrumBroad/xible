'use strict';

module.exports = function(FLUX) {

	function constr(NODE) {

		let numberIn = NODE.addInput('number', {
			type: "math.number"
		});

		let resultOut = NODE.addOutput('result', {
			type: "math.number"
		});

		resultOut.on('trigger', (state, callback) => {

			FLUX.Node.getValuesFromInput(numberIn, state).then((numbers) => {

				let result = numbers.map((number) => {
					return Math.round(number);
				})

				callback(result);

			});

		});

	}

	FLUX.addNode('math.round', {
		type: "object",
		level: 0,
		groups: ["math"]
	}, constr);

};
