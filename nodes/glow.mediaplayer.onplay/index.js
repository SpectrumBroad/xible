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

			let path = null;
			let thisState = state.get(this);
			if (thisState) {
				path = thisState.path;
			}

			callback(path);

		});

		NODE.on('trigger', (state) => {

			//get the glow server
			FLUX.Node.getValuesFromInput(glowServerIn, state).then((glowServers) => {

				glowServers.forEach((glowServer) => {

					glowServer.Player.on('play', (event) => {

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
