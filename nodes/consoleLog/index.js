module.exports = function(FLUX) {

	function nodeConstructor(NODE) {

		let triggerIn = NODE.getInputByName('trigger');
		triggerIn.on('trigger', (conn, state) => {

			FLUX.Node.getValuesFromInput(NODE.getInputByName('value'), state).then((strs) => {

				if (!strs.length) {
					strs.push(NODE.data.value || '');
				}

				strs.forEach(str => {

					console.log(str);

					NODE.addStatus({
						message: str + '',
						timeout: 3000
					});

				});

				FLUX.Node.triggerOutputs(NODE.getOutputByName('done'), state);

			});

		});

	}

	FLUX.addNode('console log', {
		type: "action",
		level: 0,
		groups: ["basics", "logging"],
		editorContent: `<input data-hideifattached="input[name=value]" data-outputvalue="value" type="text" placeholder="value"/>`,
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
	}, nodeConstructor);

};
