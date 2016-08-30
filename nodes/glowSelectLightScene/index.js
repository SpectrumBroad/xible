module.exports = function(flux) {

	function constructorFunction(NODE) {

		let triggerIn = NODE.addInput('trigger', {
			type: "trigger"
		});

		let sceneIn = NODE.addInput('scene', {
			type: "glowLightScene"
		});

		let lightIn = NODE.addInput('light', {
			type: "glowLight"
		});

		let triggerOut = NODE.addOutput('complete', {
			type: "trigger"
		});

		triggerIn.on('trigger', function() {

			flux.Node.getValuesFromInput(sceneIn).then(scenes => {

				flux.Node.getValuesFromInput(lightIn).then(lights => {

					var i = 0;

					lights.forEach(light => {

						light.selectScene(scenes[0], () => {

							if (++i === lights.length) {
								flux.Node.triggerOutputs(triggerOut);
							}

						});

					});

				});

			});

		});

	}

	flux.addNode('select light scene', {
		type: "action",
		level: 0,
		groups: ["glow"],
		description: "Applies a Glow light scene to one or more lights."
	}, constructorFunction);

};
