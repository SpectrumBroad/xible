module.exports = function(FLUX) {

	function constr(NODE) {

		let glowIn = NODE.addInput('glow', {
			type: "glow"
		});

		let triggerOut = NODE.addOutput('trigger', {
			type: "trigger"
		});

		NODE.on('trigger', (state) => {

			//get the glow server
			NODE.getValuesFromInput(glowIn, state).then((glows) => {

				glows.forEach((glow) => {

					glow.MediaPlayer.on('stop', (event) => {
						FLUX.Node.triggerOutputs(triggerOut, state);
					});

				});

			});

		});

	}

	FLUX.addNode('glow.mediaplayer.onstop', {
		type: "event",
		level: 0,
		groups: ["glow"]
	}, constr);

};
