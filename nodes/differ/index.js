'use strict';

module.exports = function(FLUX) {

	function constr(NODE) {

		let valuesIn = NODE.addInput('values');

		let boolOut = NODE.addOutput('result', {
			type: "boolean"
		});

		boolOut.on('trigger', (state, callback) => {

			FLUX.Node.getValuesFromInput(valuesIn, state).then((vals) => {

				if (vals.length) {

					var firstVal = vals[0];
					callback(vals.some(val => val !== firstVal));

				} else {
					callback(false);
				}

			});

		});

	}

	FLUX.addNode('differ', {
		type: "object",
		level: 0,
		groups: ["basics"]
	}, constr);

};
