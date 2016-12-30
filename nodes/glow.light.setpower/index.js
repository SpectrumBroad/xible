module.exports = function(XIBLE) {

	function constr(NODE) {

		let triggerIn = NODE.addInput('trigger', {
			type: "trigger",
			description: "Input trigger"
		});

		let lightIn = NODE.addInput('light', {
			type: "glow.light",
			description: "The light to change the power state of."
		});

		let powerIn = NODE.addInput('power', {
			type: "boolean",
			description: "If connected, the switch is ignored and this input value is used instead. If there are multiple connectors, they are evaluated using 'AND'."
		});

		let doneOut = NODE.addOutput('done', {
			type: "trigger",
			description: "Triggered when the switch has been completed. Will also trigger if there is no state change."
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
						.then(() => XIBLE.Node.triggerOutput(doneOut, state));

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
