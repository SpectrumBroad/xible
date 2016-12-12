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

			NODE.getValuesFromInput(conditionIn, state).then((bools) => {

				if (bools.length) {

					if (bools.some(bool => !bool)) {
						XIBLE.Node.triggerOutputs(elseOut, state);
					} else {
						XIBLE.Node.triggerOutputs(thenOut, state);
					}

				} else {
					XIBLE.Node.triggerOutputs(elseOut, state);
				}

			});

		});

	}

	XIBLE.addNode('trigger if', {
		type: "action",
		level: 0,
		description: `Triggers an output based on a condition.`
	}, constr);

};
