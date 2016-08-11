module.exports = function(FLUX) {

	function constr(NODE) {

		NODE.addInput('glowServer', {
			type: "glowServer"
		});

		NODE.addOutput('trigger', {
			type: "trigger"
		});

		NODE.addOutput('light', {
			type: "glowLight"
		});

		NODE.on('trigger', function() {

			//setup a websocket to glow

		});

	}

	FLUX.addNode('onGlowLightOn', {
		type: "event",
		level: 0,
		groups: ["glow"]
	}, constr);

};
