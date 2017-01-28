module.exports = function(XIBLE) {

	function constr(NODE) {

		let triggerIn = NODE.addInput('trigger', {
			type: "trigger"
		});

		let conditionIn = NODE.addInput('condition', {
			type: "boolean"
		});

		let thenOut = NODE.addOutput('then', {
			type: "trigger"
		});

		let elseOut = NODE.addOutput('else', {
			type: "trigger"
		});

		triggerIn.on('trigger', (conn, state) => {

			conditionIn.getValues(state).then((bools) => {

				if (bools.length) {

					if (bools.some(bool => !bool)) {
						elseOut.trigger( state);
					} else {
						thenOut.trigger( state);
					}

				} else {
					elseOut.trigger( state);
				}

			});

		});

	}

	XIBLE.addNode('if', {
		type: "action",
		level: 0,
		description: `Triggers an output based on a condition.`
	}, constr);

};
