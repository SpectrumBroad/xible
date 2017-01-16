module.exports = function(XIBLE) {

	function constr(NODE) {

		let docIn = NODE.addInput('document', {
			type: "document"
		});

		let variableIn = NODE.addInput('variable', {
			type: "variable"
		});

		let docOut = NODE.addOutput('document', {
			type: "document"
		});

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

	}

	XIBLE.addNode('document.assign', {
		type: "object",
		level: 0,
		description: `Assigns new key/value pairs to an existing document.`
	}, constr);

};
