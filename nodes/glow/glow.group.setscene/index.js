module.exports = function(NODE) {

	let triggerIn = NODE.getInputByName('trigger');
	let groupIn = NODE.getInputByName('group');
	let sceneIn = NODE.getInputByName('scene');

	let doneOut = NODE.getOutputByName('done');

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

};
