module.exports = function(FLUX) {


	//constructor for the node
	function constructorFunction(NODE) {

		let resultOut = NODE.getOutputByName('result');
		resultOut.on('trigger', (conn, state, callback) => {

			FLUX.Node.getValuesFromInput(NODE.getInputByName('a'), state).then((aNumbers) => {

				FLUX.Node.getValuesFromInput(NODE.getInputByName('b'), state).then((bNumbers) => {

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
		groups: ["math"],
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

	}, constructorFunction);

};
