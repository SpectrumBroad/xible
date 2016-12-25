module.exports = function(XIBLE) {

	function constr(NODE) {

		let variableIn = NODE.addInput('variable', {
			type: "variable"
		});

		let docOut = NODE.addOutput('document', {
			type: "document"
		});

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

	}

	XIBLE.addNode('document', {
		type: "object",
		level: 0,
		description: `A document containing (nested) key-value pairs.`
	}, constr);

};
