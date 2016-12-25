module.exports = function(XIBLE) {

	function constr(NODE) {

		let glowIn = NODE.addInput('glow', {
			type: "glow"
		});

		let triggerOut = NODE.addOutput('trigger', {
			type: "trigger"
		});

		let lightOut = NODE.addOutput('light', {
			type: "glow.light"
		});

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

						XIBLE.Node.triggerOutput(triggerOut, state);

					});

				});

			});

		});

	}

	XIBLE.addNode('glow.light.onpoweron', {
		type: "event",
		level: 0,
		description: `Event triggered whenever a light powers on in Glow.`
	}, constr);

};
