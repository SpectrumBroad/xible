module.exports = function(FLUX) {

	function constr(NODE) {

		let glowServerIn = NODE.addInput('glowServer', {
			type: "glowServer"
		});

		let labelIn = NODE.addInput('label', {
			type: "string",
			description: "The registered label of the light in Glow. If multiple labels are given, multiple lights will be returned through the 'light' output."
		});

		let lightOut = NODE.addOutput('light', {
			type: "glow.light",
			description: "One or more lights to return."
		});

		let powerOut = NODE.addOutput('power', {
			type: "boolean",
			description: "The current power state of the light."
		});

		let colorOut = NODE.addOutput('color', {
			type: "color",
			description: "The current color state of the light."
		});

		powerOut.on('trigger', (conn, state, callback) => {

			//get the glow server
			FLUX.Node.getValuesFromInput(glowServerIn, state).then((glowServers) => {

				glowServers.forEach((glowServer) => {

					if (labelIn.connectors.length) {

						FLUX.Node.getValuesFromInput(labelIn)
							.then((labels) => Promise.all(labels.map((label) => glowServer.Light.getByLabel(label))))
							.then((lights) => callback(lights.map((light) => light.power)));

					} else {
						glowServer.Light.getByLabel(NODE.data.label).then((light) => callback(light.power));
					}

				});

			});

		});

		lightOut.on('trigger', (conn, state, callback) => {

			//get the glow server
			FLUX.Node.getValuesFromInput(glowServerIn, state).then((glowServers) => {

				glowServers.forEach((glowServer) => {

					if (labelIn.connectors.length) {

						FLUX.Node.getValuesFromInput(labelIn)
							.then((labels) => Promise.all(labels.map((label) => glowServer.Light.getByLabel(label))))
							.then((lights) => callback(lights));

					} else {
						glowServer.Light.getByLabel(NODE.data.label).then((light) => callback(light));
					}

				});

			});

		});

	}

	FLUX.addNode('glow.light', {
		type: "object",
		level: 0,
		groups: ["glow"],
		editorContent: `<input data-hideifattached="input[name=label]" data-outputvalue="label" type="text" placeholder="label"/>`
	}, constr);

};
