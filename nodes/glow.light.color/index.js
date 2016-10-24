'use strict';

module.exports = function(FLUX) {

	function constr(NODE) {

		let triggerIn = NODE.addInput('trigger', {
			type: "trigger"
		});

		let lightIn = NODE.addInput('light', {
			type: "glow.light"
		});

		let colorIn = NODE.addInput('color', {
			type: "color"
		});

		let doneOut = NODE.addOutput('done', {
			type: "trigger"
		});

		triggerIn.on('trigger', (conn, state) => {

			FLUX.Node.getValuesFromInput(lightIn, state).then((lights) => {

				let i = 0;
				lights.forEach((light) => {

					light.powerOn(NODE.data.duration).then(() => {

						if (++i === lights.length) {
							FLUX.Node.triggerOutputs(doneOut, state);
						}

					});

				});

			});

		});

	}

	FLUX.addNode('glow.light.color', {
		type: "action",
		level: 0,
		groups: ["glow"],
		description: "Sets the color on a light registerd in Glow.",
		editorContent: `<input data-outputvalue="duration" type="number" placeholder="duration"/>`
	}, constr);

};
