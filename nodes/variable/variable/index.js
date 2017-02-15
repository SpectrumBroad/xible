module.exports = function(NODE) {

	let used = false;
	let refreshing = false;
	let variable;

	let valueIn = NODE.getInputByName('value');
	let variableOut = NODE.getOutputByName('variable');

	variableOut.on('trigger', (conn, state, callback) => {

		//perform a refresh of all inputs and return those values
		valueIn.getValues(state).then((vals) => {

			callback({
				name: NODE.data.name,
				values: vals
			});

		});

	});

};
