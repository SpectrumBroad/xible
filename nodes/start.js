module.exports = function(flux) {

	var constructorFunction = function() {

		var node = new flux.Node({
			name: "start",
			type: "event",
			level: 0,
			groups: ["basics"],
			description: "Triggered whenever the flow gets (re-)deployed or the flux server is restarted."
		});

		node.addOutput({
			name: "trigger",
			type: "trigger"
		});

		node.on('trigger', function() {
			flux.Node.triggerOutputs(this.outputs[0]);
		});

		return node;

	};

	flux.addNode('start', constructorFunction);

};
