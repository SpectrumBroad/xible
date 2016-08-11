module.exports = function(flux) {

	function constructorFunction(NODE) {

		NODE.on('trigger', () => {
			flux.Node.triggerOutputs(NODE.getOutputByName('trigger'));
		});

	}

	flux.addNode('start', {
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
