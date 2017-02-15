module.exports = function(NODE) {

	let conditionIn = NODE.getInputByName('condition');
	let trueIn = NODE.getInputByName('if true');
	let falseIn = NODE.getInputByName('if false');

	let valueOut = NODE.getOutputByName('value');
	valueOut.on('trigger', (conn, state, callback) => {

		conditionIn.getValues(state).then((bools) => {

			if (bools.length) {

				let input;
				if (bools.some(bool => !bool)) {
					input = falseIn;
				} else {
					input = trueIn;
				}
				input.getValues(state).then((values) => callback(values));

			} else {
				callback(null);
			}

		});

	});

};
