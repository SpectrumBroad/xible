module.exports = function(XIBLE) {

	function constr(NODE) {

		var valuesIn = NODE.getInputByName('values');
		var anyOut = NODE.getOutputByName('result');
		anyOut.on('trigger', (conn, state, callback) => {

			//get the input values
			valuesIn.getValues(state).then((vals) => {

				callback(vals.map((val) => {

					switch (NODE.data.castType) {

						case 'string':
							return '' + val;

						case 'json string':
							return JSON.stringify(val);

						case 'math.number':
							return +val;

						case 'boolean':
							return !!val;

						case 'date':
							return new Date(val);

						case 'time':
							let d = new Date(val);
							d.setFullYear(0, 0, 1);
							return d;

						default:	//just in case
							return val;

					}

				}));

			});

		});

	}

	XIBLE.addNode('cast', {
		type: "object",
		level: 0,
		description: 'Change data type into another.',
		inputs: {
			"values": {}
		},
		outputs: {
			"result": {
				type: "string"
			}
		}
	}, constr);

};
