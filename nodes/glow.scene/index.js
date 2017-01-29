module.exports = function(XIBLE) {

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
			glowIn.getValues(state).then((glows) => {

				Promise.all(glows.map((glow) => {

						if (sceneIn.isConnected()) {
							return sceneIn.getValues(state)
								.then((strs) => Promise.all(strs.map((str) => glow.Scene.getByName(str))));
						} else {
							return glow.Scene.getByName(NODE.data.value);
						}

					}))
					.then((scenes) => {
						callback(scenes);
					});

			});

		});

	}

	XIBLE.addNode('glow.scene', {
		type: "object",
		level: 0,
		description: "References a Glow scene."
	}, constr);

};
