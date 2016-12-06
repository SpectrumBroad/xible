module.exports = function(FLUX) {

	function constructorFunction(NODE) {

		let glowIn = NODE.addInput('glow', {
			type: "glow"
		});

		let sceneIn = NODE.addInput('name', {
			type: "string"
		});

		let sceneOut = NODE.addOutput('scene', {
			type: "glow.scene"
		});

		sceneOut.on('trigger', (conn, state, callback) => {

			if (stringInput.connectors.length) {
				NODE.getValuesFromInput(sceneIn, state).then(strs => callback(strs.map(str => Scene.getByName(str))));
			} else {
				callback(Scene.getByName(this.value));
			}

		});

	}

	FLUX.addNode('glow.scene', {
		type: "object",
		level: 0,
		groups: ["glow"],
		description: "A Glow light scene."
	}, constructorFunction);

};
