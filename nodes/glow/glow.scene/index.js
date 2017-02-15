module.exports = function(NODE) {

	let glowIn = NODE.getInputByName('glow');
	let sceneIn = NODE.getInputByName('name');

	let sceneOut = NODE.getOutputByName('scene');

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

};
