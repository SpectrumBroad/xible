module.exports = function(NODE) {

	let multiplicandIn = NODE.getInputByName('multiplicand');
	let multiplierIn = NODE.getInputByName('multiplier');

	let numberOut = NODE.getOutputByName('result');
	numberOut.on('trigger', (conn, state, callback) => {

		multiplicandIn.getValues(state).then((multiplicands) => {

			multiplierIn.getValues(state).then((multipliers) => {

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

};
