module.exports = function(FLUX) {

	function constr(NODE) {

		let glowServerIn = NODE.addInput('glowServer', {
			type: "glowServer"
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
			FLUX.Node.getValuesFromInput(glowServerIn, state).then((glowServers) => {

				glowServers.forEach((glowServer) => {

					glowServer.Light.on('on', (event) => {

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
		groups: ["glow"]
	}, constr);

};
