'use strict';

module.exports = function(FLUX) {

	function constructorFunction(NODE) {

		NODE.on('trigger', (state) => {
			FLUX.Node.triggerOutputs(NODE.getOutputByName('trigger'), state);
		});

	}

	FLUX.addNode('start', {
		type: "event",
		level: 0,
		groups: ["basics"],
		description: "Triggered whenever the flow gets (re-)deployed or the flux server is restarted.",
		outputs: {
			"trigger": {
				type: "trigger"
			}
		}
	}, constructorFunction);

};
