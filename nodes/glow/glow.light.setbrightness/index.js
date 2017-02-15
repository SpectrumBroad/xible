module.exports = function(NODE) {

	let triggerIn = NODE.getInputByName('trigger');
	let lightIn = NODE.getInputByName('light');

	let doneOut = NODE.getOutputByName('done');

	triggerIn.on('trigger', (conn, state) => {

		lightIn.getValues(state).then((lights) => {

			let duration = +NODE.data.duration || 0;
			if (duration) {

				NODE.addProgressBar({
					percentage: 0,
					updateOverTime: duration,
					timeout: duration + 700
				});

			}

			Promise.all(lights.map((light) => light.setBrightness(+NODE.data.brightness, duration)))
				.then(() => doneOut.trigger(state));

		});

	});

};
