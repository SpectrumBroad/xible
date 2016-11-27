module.exports = function(FLUX) {

	function constr(NODE) {

		var valuesIn = NODE.getInputByName('values');
		var anyOut = NODE.getOutputByName('result');
		anyOut.on('trigger', (conn, state, callback) => {

			//get the input values
			NODE.getValuesFromInput(valuesIn, state).then((vals) => {

				callback(vals.map((val) => {

					switch (NODE.data.castType) {

						case 'string':
							return '' + val;

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

	FLUX.addNode('cast', {
		type: "object",
		level: 0,
		groups: ["basics"],
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
