module.exports = function(FLUX) {

	function constr(NODE) {

		NODE.addInput('glowServer', {
			type: "glowServer"
		});

		NODE.addOutput('trigger', {
			type: "trigger"
		});

		NODE.addOutput('media', {
			type: "glowMedia"
		});

		NODE.on('trigger', function() {

			//setup a websocket to glow

		});

	}

	FLUX.addNode('onGlowMediaStart', {
		type: "event",
		level: 0,
		groups: ["glow"]
	}, constr);

};
