module.exports = function(XIBLE) {

	function constr(NODE) {

		let docIn = NODE.addInput('document', {
			type: "document"
		});

		let stringOut = NODE.addOutput('json', {
			type: "string"
		});

		stringOut.on('trigger', (conn, state, callback) => {

			docIn.getValues(state).then((docs) => {
				callback(JSON.stringify(docs));
			});

		});

	}

	XIBLE.addNode('document.tojsonstring', {
		type: "object",
		level: 0,
		description: `Converts a document into a JSON string.`
	}, constr);

};
