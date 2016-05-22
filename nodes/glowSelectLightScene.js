module.exports = function(flux) {

	var constructorFunction = function() {

		var node = new flux.Node({
			name: "select light scene",
			type: "action",
			level: 0,
			groups: ["glow"],
			description: "Applies a Glow light scene to one or more lights."
		});

		var triggerInput = node.addInput({
			name: "trigger",
			type: "trigger"
		});

		triggerInput.on('trigger', function() {

			flux.Node.getValuesFromInput(this.node.inputs[1], scenes => {

				flux.Node.getValuesFromInput(this.node.inputs[2], lights => {

					var i = 0;

					lights.forEach(light => {

						light.selectScene(scenes[0], () => {

							if (++i === lights.length) {
								flux.Node.triggerOutputs(this.node.outputs[0]);
							}

						});

					});

				});

			});

		});

		node.addInput({
			name: "scene",
			type: "glowLightScene"
		});

		node.addInput({
			name: "light",
			type: "glowLight"
		});

		node.addOutput({
			name: "complete",
			type: "trigger"
		});

		return node;

	};

	flux.addNode('select light scene', constructorFunction);

};
