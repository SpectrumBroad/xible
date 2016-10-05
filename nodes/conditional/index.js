'use strict';

module.exports = function(FLUX) {

	function constr(NODE) {

		let conditionIn = NODE.addInput('condition', {
			type: "boolean"
		});

		let trueIn = NODE.addInput('if true');

		let falseIn = NODE.addInput('if false');

		let valueOut = NODE.addOutput('value');
		valueOut.on('trigger', (conn, state, callback) => {

			FLUX.Node.getValuesFromInput(conditionIn, state).then((bools) => {

				if (bools.length) {

					let input;
					if (bools.some(bool => !bool)) {
						input = falseIn;
					} else {
						input = trueIn;
					}
					FLUX.Node.getValuesFromInput(input, state).then((values) => callback(values));

				} else {
					callback(null);
				}

			});

		});

	}

	FLUX.addNode('conditional', {
		type: "object",
		level: 0,
		groups: ["basics"]
	}, constr);

};
