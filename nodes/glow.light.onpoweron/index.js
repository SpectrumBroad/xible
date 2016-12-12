module.exports = function(FLUX) {

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
			NODE.getValuesFromInput(glowIn, state).then((glows) => {

				glows.forEach((glow) => {

					glow.Light.on('powerOn', (event) => {

						state.set(this, {
							light: event.light
						});

						FLUX.Node.triggerOutputs(triggerOut, state);

					});

				});

			});

		});

	}

	FLUX.addNode('glow.light.onpoweron', {
		type: "event",
		level: 0,
		description: `Event triggered whenever a light powers on in Glow.`
	}, constr);

};
