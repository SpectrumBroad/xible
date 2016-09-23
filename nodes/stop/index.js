'use strict';

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

	FLUX.addNode('stop', {
		type: "object",
		level: 0,
		groups: ["basics"]
	}, constr);

};
