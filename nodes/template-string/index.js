module.exports = function(FLUX) {

	function constructorFunction(NODE) {

		function templateStringParser(str, vars) {
			return str.replace(/(^|(?:\\\\)+|\\.|[^\\])\$\{(\w*?)\}/g, (match, pre, varName) => {

				let foundVar = vars.find((v) => v.name === varName);
				return pre + (foundVar && foundVar.values.length ? foundVar.values.reduce((prevVal, currentVal) => prevVal + currentVal) : `\${${varName}}`);

			}).replace(/\\(.)/g, (match, first) => first);
		}

		var stringOut = NODE.getOutputByName('result');
		stringOut.on('trigger', (conn, state, callback) => {

			NODE.getValuesFromInput(NODE.getInputByName('variable'), state).then((vars) => {
				callback(templateStringParser(NODE.data.value || '', vars));
			});
		});

	}

	FLUX.addNode('template-string', {
		type: "object",
		level: 0,
		groups: ["basics"],
		inputs: {
			"variable": {
				type: "variable"
			}
		},
		outputs: {
			"result": {
				type: "string"
			}
		}
	}, constructorFunction);

};
