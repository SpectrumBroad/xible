module.exports = function(XIBLE) {

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

	XIBLE.addNode('xible.flow.stop', {
		type: "action",
		level: 0,
		description: `Stops this flow.`
	}, constr);

};
