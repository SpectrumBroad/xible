module.exports = function(NODE) {

	let glowIn = NODE.getInputByName('glow');

	let triggerOut = NODE.getOutputByName('trigger');
	let pathOut = NODE.getOutputByName('path');

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

					triggerOut.trigger(state);

				});

			});

		});

	});

};
