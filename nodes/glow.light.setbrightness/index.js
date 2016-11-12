'use strict';

module.exports = function(FLUX) {

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

			FLUX.Node.getValuesFromInput(lightIn, state).then((lights) => {

				let duration = +NODE.data.duration || 0;
				if (duration) {

					NODE.addProgressBar({
						percentage: 0,
						updateOverTime: duration,
						timeout: duration + 700
					});

				}

				Promise.all(lights.map((light) => light.setBrightness(+NODE.data.brightness, duration)))
					.then(() => FLUX.Node.triggerOutputs(doneOut, state));

			});

		});

	}

	FLUX.addNode('glow.light.setbrightness', {
		type: "action",
		level: 0,
		groups: ["glow"],
		description: "Sets the brightness on a light registered in Glow."
	}, constr);

};
