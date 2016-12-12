module.exports = function(FLUX) {

	function constr(NODE) {

		let aIn = NODE.addInput('a', {
			type: "string"
		});

		let bIn = NODE.addInput('b', {
			type: "string"
		});

		let stringOut = NODE.addOutput('string', {
			type: "string"
		});

		stringOut.on('trigger', function(state, callback) {

			NODE.getValuesFromInput(aIn, state).then(strsa => {

				NODE.getValuesFromInput(bIn, state).then(strsb => {

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

	}

	FLUX.addNode('string.concat', {
		type: "object",
		level: 0,
		description: `Concatenates strings a and b together in that order.`
	}, constr);

};
