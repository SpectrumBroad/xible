module.exports = function(NODE) {

	let valuesIn = NODE.getInputByName('values');

	let boolOut = NODE.getOutputByName('result');
	boolOut.on('trigger', (conn, state, callback) => {

		valuesIn.getValues(state).then((vals) => {

			if (vals.length) {

				var firstVal = vals[0];
				callback(vals.every(val => val === firstVal));

			} else {
				callback(false);
			}

		});

	});

};
