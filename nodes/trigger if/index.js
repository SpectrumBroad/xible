module.exports = function(FLUX) {

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
						FLUX.Node.triggerOutputs(elseOut, state);
					} else {
						FLUX.Node.triggerOutputs(thenOut, state);
					}

				} else {
					FLUX.Node.triggerOutputs(elseOut, state);
				}

			});

		});

	}

	FLUX.addNode('trigger if', {
		type: "action",
		level: 0,
		description: `Triggers an output based on a condition.`
	}, constr);

};
