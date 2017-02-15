module.exports = function(NODE) {

	let glowIn = NODE.getInputByName('glow');

	let triggerOut = NODE.getOutputByName('trigger');
	NODE.on('trigger', (state) => {

		//get the glow server
		glowIn.getValues(state).then((glows) => {

			glows.forEach((glow) => {

				glow.MediaPlayer.on('stop', (event) => {
					triggerOut.trigger(state);
				});

			});

		});

	});

};
