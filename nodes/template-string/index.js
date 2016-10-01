module.exports = function(FLUX) {

	function constructorFunction(NODE) {

		function templateStringParser(str, a) {
			return str.replace(/(^|(?:\\\\)+|\\.|[^\\])\$\{variable\}/g, (match, first) => first+a).replace(/\\(.)/g, (match, first) => first);
		}

		var stringOut = NODE.getOutputByName('result');
		stringOut.on('trigger', (conn, state, callback) => {

			FLUX.Node.getValuesFromInput(NODE.getInputByName('variable'), state).then(a => {

				let concatStr = a.reduce((prevVal, currentVal) => prevVal + currentVal);
				callback(templateStringParser(NODE.data.value || '', concatStr));

			});
		});

	}

	FLUX.addNode('template-string', {
		type: "object",
		level: 0,
		groups: ["basics"],
		editorContent: `<input type="text" data-outputvalue="value" />`,
		inputs: {
			"variable": {
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
