module.exports = function(XIBLE) {

	function constr(NODE) {

		let triggerIn = NODE.addInput('trigger', {
			type: "trigger"
		});

		let lightIn = NODE.addInput('light', {
			type: "glow.light"
		});

		let powerIn = NODE.addInput('power', {
			type: "boolean"
		});

		let doneOut = NODE.addOutput('done', {
			type: "trigger"
		});

		triggerIn.on('trigger', (conn, state) => {

			NODE.getValuesFromInput(lightIn, state).then((lights) => {

				NODE.getValuesFromInput(powerIn, state).then((powers) => {

					let power = NODE.data.power === 'true';
					if (powers.length) {
						power = powers.indexOf(false) === -1;
					}

					let duration = +NODE.data.duration || 0;
					if (duration) {

						NODE.addProgressBar({
							percentage: 0,
							updateOverTime: duration,
							timeout: duration + 700
						});

					}

					Promise.all(lights.map((light) => light.connected && (power ? light.powerOn(duration) : light.powerOff(duration))))
						.then(() => XIBLE.Node.triggerOutputs(doneOut, state));

				});

			});

		});

	}

	XIBLE.addNode('glow.light.setpower', {
		type: "action",
		level: 0,
		description: "Changes the power setting on a registrered in Glow."
	}, constr);

};
