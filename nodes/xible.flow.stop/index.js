module.exports = function(FLUX) {

	function constr(NODE) {

		let triggerIn = NODE.addInput('trigger', {
			type: "trigger"
		});

		triggerIn.on('trigger', (conn, state) => {

			process.send({
				method: "stop"
			});

		});

	}

	FLUX.addNode('xible.flow.stop', {
		type: "action",
		level: 0,
		description: `Stops this flow.`
	}, constr);

};
