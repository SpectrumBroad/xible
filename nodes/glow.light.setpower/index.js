module.exports = function(XIBLE) {

	function constr(NODE) {

		let triggerIn = NODE.addInput('trigger', {
			type: "trigger",
			description: "Input trigger to start this action."
		});

		let lightIn = NODE.addInput('light', {
			type: "glow.light",
			description: "The light(s) to change the power state of."
		});

		let powerIn = NODE.addInput('power', {
			type: "boolean",
			description: "If connected, the power state switch is hidden/ignored and this connected value is used instead to set the new power state of the light(s). If there are multiple connectors, all have to be 'true' or else the new power state will be off (false)."
		});

		let doneOut = NODE.addOutput('done', {
			type: "trigger",
			description: "Triggered when the power state change has been completed. This will also trigger if there is no state change."
		});

		triggerIn.on('trigger', (conn, state) => {

			lightIn.getValues(state).then((lights) => {

				powerIn.getValues(state).then((powers) => {

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
						.then(() => NODE.triggerOutput(doneOut, state));

				});

			});

		});

	}

	XIBLE.addNode('glow.light.setpower', {
		type: "action",
		level: 0,
		description: "Changes the power setting on a registrered light in Glow."
	}, constr);

};
