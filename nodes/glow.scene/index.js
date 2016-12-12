module.exports = function(FLUX) {

	function constr(NODE) {

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

			//get the glow server
			NODE.getValuesFromInput(glowIn, state).then((glows) => {

				callback(glows.map((glow) => {

					if (sceneIn.connectors.length) {
						return NODE.getValuesFromInput(sceneIn, state)
							.then((strs) => strs.map((str) => glow.Scene.getByName(str)));
					} else {
						return glow.Scene.getByName(NODE.data.value);
					}

				}));

			});

		});

	}

	FLUX.addNode('glow.scene', {
		type: "object",
		level: 0,
		description: "References a Glow light scene."
	}, constr);

};
