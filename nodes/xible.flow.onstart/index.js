module.exports = function(XIBLE) {

	function constr(NODE) {

		NODE.on('trigger', (state) => {
			NODE.getOutputByName('trigger').trigger(state);
		});

	}

	XIBLE.addNode('xible.flow.onstart', {
		type: "event",
		level: 0,
		description: `Triggered whenever this flow is started.`,
		outputs: {
			"trigger": {
				type: "trigger"
			}
		}
	}, constr);

};
