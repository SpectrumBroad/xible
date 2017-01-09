module.exports = function(XIBLE) {

	function constr(NODE) {

		let glowIn = NODE.addInput('glow', {
			type: "glow"
		});

		let triggerOut = NODE.addOutput('trigger', {
			type: "trigger"
		});

		let pathOut = NODE.addOutput('path', {
			type: "string"
		});

		pathOut.on('trigger', (conn, state, callback) => {

			let thisState = state.get(this);
			callback((thisState && thisState.path) || null);

		});

		NODE.on('trigger', (state) => {

			//get the glow server
			glowIn.getValues(state).then((glows) => {

				glows.forEach((glow) => {

					glow.MediaPlayer.on('play', (event) => {

						state.set(this, {
							path: event.path
						});

						NODE.triggerOutput(triggerOut, state);

					});

				});

			});

		});

	}

	XIBLE.addNode('glow.mediaplayer.onplay', {
		type: "event",
		level: 0,
		description: `Triggered whenever a mediaplayer connected through Glow begins to play.`
	}, constr);

};
