'use strict';

module.exports = function(FLUX) {

	function constr(NODE) {

		let glowServerIn = NODE.addInput('glowServer', {
			type: "glowServer"
		});

		let triggerOut = NODE.addOutput('trigger', {
			type: "trigger"
		});

		let mediaOut = NODE.addOutput('media', {
			type: "string"
		});

		mediaOut.on('trigger', function(state, callback) {
			callback(state.get(this).value);
		});

		NODE.on('trigger', (state) => {

			//get the glow server
			FLUX.Node.getValuesFromInput(glowServerIn, state).then((glowServers) => {

				glowServers.forEach((glowServer) => {

					glowServer.on('message', (ev) => {

						console.log(ev);

						let state = this.getState();
						state.media=ev.file;

						/*

						state.getOutputByName('media').on('trigger', (callback) => {
							callback(ev.file);
						});

						*/

						FLUX.Node.triggerOutputs(triggerOut, state);

						//FLUX.Node.triggerOutputs(triggerOut);

					});

				});

			});

		});

	}

	FLUX.addNode('onGlowMediaStart', {
		type: "event",
		level: 0,
		groups: ["glow"]
	}, constr);

};
