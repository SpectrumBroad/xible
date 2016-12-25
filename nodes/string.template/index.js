module.exports = function(XIBLE) {

	function constr(NODE) {

		function templateStringParser(str, vars) {
			return str.replace(/(^|(?:\\\\)+|\\.|[^\\])\$\{(\w*?)\}/g, (match, pre, varName) => {

				let foundVar = vars.find((v) => v.name === varName);
				return pre + (foundVar && foundVar.values.length ? foundVar.values.reduce((prevVal, currentVal) => prevVal + currentVal) : `\${${varName}}`);

			}).replace(/\\(.)/g, (match, first) => first);
		}

		var stringOut = NODE.getOutputByName('result');
		stringOut.on('trigger', (conn, state, callback) => {

			NODE.getInputByName('variable').getValues(state).then((vars) => {
				callback(templateStringParser(NODE.data.value || '', vars));
			});
		});

	}

	XIBLE.addNode('string.template', {
		type: "object",
		level: 0,
		description: `Parses a template string with input variables. Variables can be addressed by their name like so: \${variableName}`,
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
	}, constr);

};
