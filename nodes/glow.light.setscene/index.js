module.exports = function(XIBLE) {

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

			sceneIn.getValues(state).then((scenes) => {

				lightIn.getValues(state).then((lights) => {

					let i = 0;
					lights.forEach((light) => {

						light.selectScene(scenes[0]).then(() => {

							if (++i === lights.length) {
								triggerOut.trigger( state);
							}

						});

					});

				});

			});

		});

	}

	XIBLE.addNode('glow.light.setscene', {
		type: "action",
		level: 0,
		description: "Applies a Glow light scene to one or more lights."
	}, constructorFunction);

};
