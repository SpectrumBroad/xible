const sentiment = require('sentiment');

module.exports = function(FLUX) {

	function constr(NODE) {

		let stringIn = NODE.addInput('string', {
			type: "string"
		});

		let scoreOut = NODE.addOutput('score', {
			type: "math.number"
		});

		scoreOut.on('trigger', (conn, state, callback) => {

			NODE.getValuesFromInput(stringIn, state).then((strs) => {

				let results;

				if (strs.length) {
					results = strs.map((str) => sentiment(str).score);
				} else {
					results = [];
				}

				callback(results);

			});

		});

	}

	FLUX.addNode('sentiment', {
		type: "object",
		level: 0,
		groups: ["analysis"]
	}, constr);

};
