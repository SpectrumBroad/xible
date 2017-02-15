module.exports = function(NODE) {

	let triggerIn = NODE.getInputByName('trigger');
	let conditionIn = NODE.getInputByName('condition');
	let thenOut = NODE.getOutputByName('then');
	let elseOut = NODE.getOutputByName('else');

	triggerIn.on('trigger', (conn, state) => {

		conditionIn.getValues(state).then((bools) => {

			if (bools.length) {

				if (bools.some(bool => !bool)) {
					elseOut.trigger(state);
				} else {
					thenOut.trigger(state);
				}

			} else {
				elseOut.trigger(state);
			}

		});

	});

};
