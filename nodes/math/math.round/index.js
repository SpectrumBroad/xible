module.exports = function(NODE) {

	let numberIn = NODE.getInputByName('number');

	let resultOut = NODE.getOutputByName('result');
	resultOut.on('trigger', (conn, state, callback) => {

		numberIn.getValues(state).then((numbers) => {

			let result = numbers.map((number) => {
				return Math.round(number);
			});

			callback(result);

		});

	});

};
