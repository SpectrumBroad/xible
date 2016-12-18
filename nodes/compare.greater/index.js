module.exports = function(XIBLE) {

	function constr(NODE) {

		let aIn = NODE.addInput('a', {
			type: 'math.number'
		});

		let bIn = NODE.addInput('b', {
			type: 'math.number'
		});

		let boolOut = NODE.addOutput('result', {
			type: 'boolean'
		});

		boolOut.on('trigger', (conn, state, callback) => {

			aIn.getValues(state).then((as) => {

				bIn.getValues(state).then((bs) => {

					if (as.length && bs.length) {

						let minA = Math.min.apply(null, as);
						let maxB = Math.max.apply(null, bs);
						callback(minA > maxB);

					} else {
						callback(false);
					}

				});

			});

		});

	}

	XIBLE.addNode('compare.greater', {
		type: "object",
		level: 0,
		description: `Checks if all the inputs of 'a' or greater than any of the inputs of 'b'.`
	}, constr);

};
