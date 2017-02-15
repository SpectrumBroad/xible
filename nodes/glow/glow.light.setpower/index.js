module.exports = function(NODE) {

		let triggerIn = NODE.getInputByName('trigger');
		let lightIn = NODE.getInputByName('light');
		let powerIn = NODE.getInputByName('power');

		let doneOut = NODE.getOutputByName('done');

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
						.then(() => doneOut.trigger( state));

				});

			});

		});

};
