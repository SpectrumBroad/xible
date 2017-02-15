module.exports = function(NODE) {

	let varIn = NODE.getInputByName('variable');
	let valueOut = NODE.getOutputByName('value');

	valueOut.on('trigger', (conn, state, callback) => {

		varIn.getValues(state).then((variables) => {
			callback([].concat(...variables.map((variable) => variable.values)));
		});

	});

};
