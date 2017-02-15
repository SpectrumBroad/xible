module.exports = function(NODE) {

	let numbersIn = NODE.getInputByName('numbers');

	let numberOut = NODE.getOutputByName('number');
	numberOut.on('trigger', (conn, state, callback) => {

		numbersIn.getValues(state).then((numbers) => {

			let sum = numbers.reduce((previousValue, currentValue) => previousValue + currentValue);
			callback(sum / numbers.length);

		});

	});

};
