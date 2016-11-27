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

			NODE.getValuesFromInput(lightIn, state).then((lights) => {

				let duration = +NODE.data.duration || 0;
				if (duration) {

					NODE.addProgressBar({
						percentage: 0,
						updateOverTime: duration,
						timeout: duration + 700
					});

				}

				Promise.all(lights.map((light) => light.connected && light.powerOn(duration)))
					.then(() => FLUX.Node.triggerOutputs(doneOut, state));

			});

		});

	}

	FLUX.addNode('glow.light.poweron', {
		type: "action",
		level: 0,
		groups: ["glow"],
		description: "Powers on a light registrered in Glow."
	}, constr);

};
