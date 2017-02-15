module.exports = function(NODE) {

	let stringIn = NODE.getInputByName('string');

	let resultOut = NODE.getOutputByName('result');
	resultOut.on('trigger', (conn, state, callback) => {

		stringIn.getValues(state).then((strs) => {

			let result = '';
			for (let i = 0; i < strs.length; ++i) {

				let str = strs[i];
				if (typeof str === 'string') {
					result += str.trim();
				}

			}

			callback(result);

		});

	});

};
