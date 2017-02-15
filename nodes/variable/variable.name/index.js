module.exports = function(NODE) {

	let varIn = NODE.getInputByName('variable');
	let nameOut = NODE.getOutputByName('name');

	nameOut.on('trigger', (conn, state, callback) => {

		varIn.getValues(state).then((variables) => {
			callback([].concat(...variables.map((variable) => variable.name)));
		});

	});

};
