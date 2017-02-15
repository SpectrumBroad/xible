module.exports = function(NODE) {

	let glowIn = NODE.getInputByName('glow');

	let triggerOut = NODE.getOutputByName('trigger');
	let lightOut = NODE.getOutputByName('light');

	lightOut.on('trigger', (conn, state, callback) => {

		let light = null;
		let thisState = state.get(this);
		if (thisState) {
			light = thisState.path;
		}

		callback(light);

	});

	NODE.on('trigger', (state) => {

		//get the glow server
		glowIn.getValues(state).then((glows) => {

			glows.forEach((glow) => {

				glow.Light.on('powerOn', (event) => {

					state.set(this, {
						light: event.light
					});

					triggerOut.trigger(state);

				});

			});

		});

	});

};
