'use strict';

module.exports = function(flux) {

	function constr(NODE) {

		let triggerIn = NODE.addInput('trigger', {
			type: "trigger"
		});

		let lightIn = NODE.addInput('light', {
			type: "glow.light"
		});

		let doneOut = NODE.addOutput('done', {
			type: "trigger"
		});

		triggerIn.on('trigger', (conn, state) => {

			flux.Node.getValuesFromInput(lightIn, state).then((lights) => {

				let i = 0;
				lights.forEach((light) => {

					light.powerOn().then(() => {

						if (++i === lights.length) {
							flux.Node.triggerOutputs(doneOut, state);
						}

					});

				});

			});

		});

	}

	flux.addNode('glow.light.poweron', {
		type: "action",
		level: 0,
		groups: ["glow"],
		description: "Applies a Glow light scene to one or more lights."
	}, constr);

};
