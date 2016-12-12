module.exports = function(FLUX) {


	//constructor for the node
	function constr(NODE) {

		let resultOut = NODE.getOutputByName('result');
		resultOut.on('trigger', (conn, state, callback) => {

			NODE.getValuesFromInput(NODE.getInputByName('a'), state).then((aNumbers) => {

				NODE.getValuesFromInput(NODE.getInputByName('b'), state).then((bNumbers) => {

					//get the min (b) value
					//if multiply b values given, we take the first one only
					var min;
					if (bNumbers.length) {
						min = bNumbers[0];
					} else {
						min = NODE.data.value || 0;
					}

					//take all aNumbers minus the min and output them
					var result = [];
					aNumbers.forEach(aNumber => {
						result.push(aNumber - min);
					});

					callback(result);

				});

			});

		});

	}


	//setup the node definition
	FLUX.addNode('math.substract', {

		type: "object",
		level: 0,
		description: `Returns a list of all 'a' inputs minus the first 'b' input or the given value.`,
		inputs: {
			"a": {
				type: "math.number"
			},
			"b": {
				type: "math.number"
			}
		},
		outputs: {
			"result": {
				type: "math.number"
			}
		}

	}, constr);

};
