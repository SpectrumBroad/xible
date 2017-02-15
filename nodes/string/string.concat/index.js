module.exports = function(NODE) {

	let aIn = NODE.getInputByName('a');
	let bIn = NODE.getInputByName('b');

	let stringOut = NODE.getOutputByName('string');

	stringOut.on('trigger', (conn, state, callback) => {

		aIn.getValues(state).then((strsa) => {

			bIn.getValues(state).then((strsb) => {

				let result = '';
				if (strsa.length) {

					strsa.forEach(str => {
						result += str;
					});

				}

				if (strsb.length) {

					strsb.forEach(str => {
						result += str;
					});

				}

				callback(result);

			});

		});

	});

};
