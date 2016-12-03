'use strict';

module.exports = function(FLUX) {

	function constr(NODE) {

		let glowServerIn = NODE.addInput('glowServer', {
			type: "glowServer"
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
			NODE.getValuesFromInput(glowServerIn, state).then((glowServers) => {

				glowServers.forEach((glowServer) => {

					glowServer.MediaPlayer.on('play', (event) => {

						state.set(this, {
							path: event.path
						});

						FLUX.Node.triggerOutputs(triggerOut, state);

					});

				});

			});

		});

	}

	FLUX.addNode('glow.mediaplayer.onplay', {
		type: "event",
		level: 0,
		groups: ["glow"]
	}, constr);

};
