module.exports = function(XIBLE) {


	//constructor for the node
	function constr(NODE) {

		let resultOut = NODE.getOutputByName('result');
		resultOut.on('trigger', (conn, state, callback) => {

			NODE.getValuesFromInput(NODE.getInputByName('values'), state).then((vals) => {

				let result = vals.reduce((prevVal, newVal) => {
					return +prevVal + newVal;
				}, 0);
				callback(result + (+NODE.data.value || 0));

			});

		});

	}


	//setup the node definition
	XIBLE.addNode('math.add', {

		type: "object",
		level: 0,
		description: `Sums all the input values together, including the given value.`,
		inputs: {
			"values": {
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
