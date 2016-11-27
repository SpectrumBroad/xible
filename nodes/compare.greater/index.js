'use strict';

module.exports = function(FLUX) {

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

			NODE.getValuesFromInput(aIn, state).then((as) => {

				NODE.getValuesFromInput(bIn, state).then((bs) => {

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

	FLUX.addNode('compare.greater', {
		type: "object",
		level: 0,
		groups: ["basics"]
	}, constr);

};
