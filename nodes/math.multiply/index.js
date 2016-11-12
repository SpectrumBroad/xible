'use strict';

module.exports = function(FLUX) {

	function constr(NODE) {

		let multiplicandIn = NODE.addInput('multiplicand', {
			type: 'math.number'
		});

		let multiplierIn = NODE.addInput('multiplier', {
			type: 'math.number'
		});

		let numberOut = NODE.addOutput('result', {
			type: "math.number"
		});

		numberOut.on('trigger', (conn, state, callback) => {

			FLUX.Node.getValuesFromInput(multiplicandIn, state).then((multiplicands) => {

				FLUX.Node.getValuesFromInput(multiplierIn, state).then((multipliers) => {

					//get the multiplier
					//if multiply multipliers given, we take the first one only
					let multiplier;
					if (multipliers.length) {
						multiplier = multipliers[0];
					} else {
						multiplier = NODE.data.value || 0;
					}

					//take all mutiplicans times the multiplier and output them
					let result = [];
					multiplicands.forEach(multiplicand => {
						result.push(multiplicand * multiplier);
					});

					callback(result);

				});

			});

		});

	}

	FLUX.addNode('math.multiply', {
		type: "object",
		level: 0,
		groups: ["math"]
	}, constr);

};
