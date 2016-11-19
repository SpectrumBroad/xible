module.exports = function(FLUX) {

	function constr(NODE) {

		let glowServerIn = NODE.addInput('glowServer', {
			type: "glowServer"
		});

		let triggerOut = NODE.addOutput('trigger', {
			type: "trigger"
		});

		NODE.on('trigger', (state) => {

			//get the glow server
			FLUX.Node.getValuesFromInput(glowServerIn, state).then((glowServers) => {

				glowServers.forEach((glowServer) => {

					glowServer.MediaPlayer.on('stop', (event) => {
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
