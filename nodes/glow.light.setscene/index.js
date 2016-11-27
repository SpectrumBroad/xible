module.exports = function(FLUX) {

	function constructorFunction(NODE) {

		let triggerIn = NODE.addInput('trigger', {
			type: "trigger"
		});

		let sceneIn = NODE.addInput('scene', {
			type: "glow.scene"
		});

		let lightIn = NODE.addInput('light', {
			type: "glow.light"
		});

		let triggerOut = NODE.addOutput('complete', {
			type: "trigger"
		});

		triggerIn.on('trigger', (conn, state) => {

			NODE.getValuesFromInput(sceneIn, state).then((scenes) => {

				NODE.getValuesFromInput(lightIn, state).then((lights) => {

					let i = 0;
					lights.forEach((light) => {

						light.selectScene(scenes[0]).then(() => {

							if (++i === lights.length) {
								FLUX.Node.triggerOutputs(triggerOut, state);
							}

						});

					});

				});

			});

		});

	}

	FLUX.addNode('glow.light.setscene', {
		type: "action",
		level: 0,
		groups: ["glow"],
		description: "Applies a Glow light scene to one or more lights."
	}, constructorFunction);

};
