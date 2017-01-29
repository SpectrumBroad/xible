module.exports = function(XIBLE) {

	function constr(NODE) {

		let triggerIn = NODE.addInput('trigger', {
			type: "trigger"
		});

		let groupIn = NODE.addInput('group', {
			type: "glow.group"
		});

		let sceneIn = NODE.addInput('scene', {
			type: "glow.scene",
      maxConnectors: 1
		});

		let doneOut = NODE.addOutput('done', {
			type: "trigger"
		});

		triggerIn.on('trigger', (connector, state) => {

			if (!sceneIn.isConnected() || !groupIn.isConnected()) {
				return;
			}

			Promise.all([groupIn.getValues(state), sceneIn.getValues(state)])
				.then(([groups, scenes]) => {
					return groups.map((group) => group.setScene(scenes[0]));
				})
				.then(() => {
					doneOut.trigger(state);
				});

		});

	}

	XIBLE.addNode('glow.group.setscene', {
		type: "action",
		level: 0,
		description: "Assigns a scene to a Glow group."
	}, constr);

};
