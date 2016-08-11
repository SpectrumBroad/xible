module.exports = function(flux) {

	function constructorFunction(NODE) {

		var stringOut = NODE.getOutputByName('result');
		stringOut.on('trigger', (callback) => {

			flux.Node.getValuesFromInput(NODE.getInputByName('concat'), strs => {

				var concatStr = '';
				strs.forEach(str => {
					concatStr += str;
				});

				callback(concatStr + (NODE.data.value || ''));

			});
		});

	}

	flux.addNode('string', {
		type: "object",
		level: 0,
		groups: ["basics"],
		editorContent: `<input type="text" data-outputvalue="value" />`,
		inputs: {
			"concat": {
				type: "string"
			}
		},
		outputs: {
			"result": {
				type: "string"
			}
		}
	}, constructorFunction);

};
