module.exports = function(XIBLE) {

	function constr(NODE) {

		let glowIn = NODE.addInput('glow', {
			type: "glow"
		});

		let triggerOut = NODE.addOutput('trigger', {
			type: "trigger"
		});

		NODE.on('trigger', (state) => {

			//get the glow server
			glowIn.getValues(state).then((glows) => {

				glows.forEach((glow) => {

					glow.MediaPlayer.on('stop', (event) => {
						XIBLE.Node.triggerOutputs(triggerOut, state);
					});

				});

			});

		});

	}

	XIBLE.addNode('glow.mediaplayer.onstop', {
		type: "event",
		level: 0,
		description: `Triggered whenever a mediaplayer connected through Glow stops.`
	}, constr);

};
