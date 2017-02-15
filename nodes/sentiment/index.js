const sentiment = require('sentiment');

module.exports = function(NODE) {

	let stringIn = NODE.getInputByName('string');

	let scoreOut = NODE.getOutputByName('score');
	scoreOut.on('trigger', (conn, state, callback) => {

		stringIn.getValues(state).then((strs) => {

			let results;

			if (strs.length) {
				results = strs.map((str) => sentiment(str).score);
			} else {
				results = [];
			}

			callback(results);

		});

	});

};
