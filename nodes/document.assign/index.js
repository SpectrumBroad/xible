module.exports = function(NODE) {

	let docIn = NODE.getInputByName('document');
	let variableIn = NODE.getInputByName('variable');

	let docOut = NODE.getOutputByName('document');

	docOut.on('trigger', (conn, state, callback) => {

		Promise.all([docIn.getValues(state), variableIn.getValues(state)]).then(([docs, variables]) => {

			docs.forEach((doc) => {

				//copy the document
				//FIXME: should merge deep
				doc = Object.assign({}, doc);

				//add/overwrite the new vars
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

	});

};
