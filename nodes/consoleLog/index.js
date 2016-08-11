module.exports = function(flux) {

	function nodeConstructor(NODE) {

		let triggerIn = NODE.getInputByName('trigger');
		triggerIn.on('trigger', function() {

			flux.Node.getValuesFromInput(NODE.getInputByName('any'), strs => {

				if (!strs.length) {
					strs.push(NODE.data.value || '');
				}

				strs.forEach(str => {

					console.log(str);

					NODE.addStatus({
						message: str,
						timeout: 3000
					});

				});

			});

		});

	}

	flux.addNode('console log', {
		type: "action",
		level: 0,
		groups: ["basics", "logging"],
		editorContent: `<input data-hideifattached="input[name=any]" data-outputvalue="value" type="text" placeholder="value"/>`,
		inputs: {
			"trigger": {
				type: "trigger"
			},
			"any": {}
		}
	}, nodeConstructor);

};
