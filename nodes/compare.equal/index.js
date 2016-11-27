'use strict';

module.exports = function(FLUX) {

	function constr(NODE) {

		let valuesIn = NODE.addInput('values');

		let boolOut = NODE.addOutput('result', {
			type: "boolean"
		});

		boolOut.on('trigger', (conn, state, callback) => {

			NODE.getValuesFromInput(valuesIn, state).then((vals) => {

				if (vals.length) {

					var firstVal = vals[0];
					callback(vals.every(val => val === firstVal));

				} else {
					callback(false);
				}

			});

		});

	}

	FLUX.addNode('compare.equal', {
		type: "object",
		level: 0,
		groups: ["basics"]
	}, constr);

};
