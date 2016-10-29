'use strict';

module.exports = function(FLUX) {

	function constr(NODE) {

		let triggerIn = NODE.addInput('trigger', {
			type: "trigger"
		});

		triggerIn.on('trigger', (conn, state) => {

			FLUX.getFlowById(NODE.data.flowName, (flow) => {

				if (flow) {
					flow.start();
				}

			});

		});

	}

	FLUX.addNode('flux.flow.start', {
		type: "action",
		level: 0,
		groups: ["basics"]
	}, constr);

};
