module.exports = function(flux) {

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

		triggerIn.on('trigger', (state) => {

			flux.Node.getValuesFromInput(sceneIn, state).then(scenes => {

				flux.Node.getValuesFromInput(lightIn, state).then(lights => {

					let i = 0;

					lights.forEach(light => {

						light.selectScene(scenes[0], () => {

							if (++i === lights.length) {
								flux.Node.triggerOutputs(triggerOut, state);
							}

						});

					});

				});

			});

		});

	}

	flux.addNode('glow.light.setscene', {
		type: "action",
		level: 0,
		groups: ["glow"],
		description: "Applies a Glow light scene to one or more lights."
	}, constructorFunction);

};
