'use strict';

module.exports = function(FLUX) {

	function constructorFunction(NODE) {

		NODE.on('trigger', (state) => {
			FLUX.Node.triggerOutputs(NODE.getOutputByName('trigger'), state);
		});

	}

	FLUX.addNode('flux.flow.onstart', {
		type: "event",
		level: 0,
		groups: ["xible"],
		description: "Triggered whenever this flow is started.",
		outputs: {
			"trigger": {
				type: "trigger"
			}
		}
	}, constructorFunction);

};
