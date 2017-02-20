module.exports = function(NODE) {

	let docIn = NODE.getInputByName('document');

	let stringOut = NODE.getOutputByName('json');

	stringOut.on('trigger', (conn, state, callback) => {

		docIn.getValues(state).then((docs) => {
			callback(JSON.stringify(docs));
		});

	});

};
