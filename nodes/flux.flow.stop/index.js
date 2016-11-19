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

	FLUX.addNode('flux.flow.stop', {
		type: "action",
		level: 0,
		groups: ["xible"]
	}, constr);

};
