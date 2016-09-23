'use strict';

module.exports = function(FLUX) {

	function constr(NODE) {

		let valuesIn = NODE.addInput('values');

		let boolOut = NODE.addOutput('result', {
			type: "boolean"
		});

		boolOut.on('trigger', (conn, state, callback) => {

			FLUX.Node.getValuesFromInput(valuesIn, state).then((vals) => {

				if (vals.length) {

					var firstVal = vals[0];
					callback(vals.every(val => val === firstVal));

				} else {
					callback(false);
				}

			});

		});

	}

	FLUX.addNode('equals', {
		type: "object",
		level: 0,
		groups: ["basics"]
	}, constr);

};
