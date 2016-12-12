module.exports = function(FLUX) {

	function log(str, NODE) {

		console.log(str);

		NODE.addStatus({
			message: str + '',
			timeout: 3000
		});

	}

	function constr(NODE) {

		let triggerIn = NODE.getInputByName('trigger');
		triggerIn.on('trigger', (conn, state) => {

			let valueInput = NODE.getInputByName('value');

			if (!valueInput.connectors.length) {

				log(NODE.data.value || '', NODE);
				return FLUX.Node.triggerOutputs(NODE.getOutputByName('done'), state);

			}

			NODE.getValuesFromInput(valueInput, state).then((strs) => {

				strs.forEach(str => {
					log(str, NODE);
				});

				FLUX.Node.triggerOutputs(NODE.getOutputByName('done'), state);

			});

		});

	}

	FLUX.addNode('log.console', {
		type: "action",
		level: 0,
		description: `Writes the given value(s) to the console.`,
		inputs: {
			"trigger": {
				type: "trigger"
			},
			"value": {}
		},
		outputs: {
			"done": {
				type: "trigger"
			}
		}
	}, constr);

};
