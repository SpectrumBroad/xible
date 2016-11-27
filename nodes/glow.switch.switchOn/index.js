module.exports = function(FLUX) {

	function constr(NODE) {

		let triggerIn = NODE.addInput('trigger', {
			type: "trigger"
		});

		let swIn = NODE.addInput('switch', {
			type: "glow.switch"
		});

		let doneOut = NODE.addOutput('done', {
			type: "trigger"
		});

		triggerIn.on('trigger', (conn, state) => {

			NODE.getValuesFromInput(swIn, state).then((sws) => {

				Promise.all(sws.map((sw) => sw.connected && sw.switchOn()))
					.then(() => FLUX.Node.triggerOutputs(doneOut, state));

			});

		});

	}

	FLUX.addNode('glow.switch.switchon', {
		type: "action",
		level: 0,
		groups: ["glow"],
		description: "Toggles a switch registrered in Glow."
	}, constr);

};
