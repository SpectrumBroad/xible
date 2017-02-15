function templateStringParser(str, vars) {
	return str.replace(/(^|(?:\\\\)+|\\.|[^\\])\$\{(\w*?)\}/g, (match, pre, varName) => {

		let foundVar = vars.find((v) => v.name === varName);
		return pre + (foundVar && foundVar.values.length ? foundVar.values.reduce((prevVal, currentVal) => prevVal + currentVal) : `\${${varName}}`);

	}).replace(/\\(.)/g, (match, first) => first);
}

module.exports = function(NODE) {

	let stringOut = NODE.getOutputByName('result');
	let varIn = NODE.getInputByName('variable');
	stringOut.on('trigger', (conn, state, callback) => {

		varIn.getValues(state).then((vars) => {
			callback(templateStringParser(NODE.data.value || '', vars));
		});
		
	});

};
