module.exports = function(NODE) {

	let variableIn = NODE.getInputByName('variable');

	let docOut = NODE.getOutputByName('document');

	docOut.on('trigger', (conn, state, callback) => {

		variableIn.getValues(state).then((variables) => {

			let doc = {};
			variables.forEach((variable) => {

				let val = variable.values;
				if (val.length === 1) {
					val = val[0];
				}

				doc[variable.name] = val;

			});

			callback(doc);

		});

	});

};
