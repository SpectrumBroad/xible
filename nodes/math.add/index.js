module.exports = function(FLUX) {


	//constructor for the node
	function constructorFunction(NODE) {

		let resultOut = NODE.getOutputByName('result');
		resultOut.on('trigger', (conn, state, callback) => {

			FLUX.Node.getValuesFromInput(NODE.getInputByName('values'), state).then((vals) => {

				let result = vals.reduce((prevVal, newVal) => {
					return +prevVal + newVal;
				}, 0);
				callback(result + (+NODE.data.value || 0));

			});

		});

	}


	//setup the node definition
	FLUX.addNode('math.add', {

		type: "object",
		level: 0,
		groups: ["math"],
		editorContent: '<input type="number" placeholder="add" value="0" data-outputvalue="value" />',
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

	}, constructorFunction);

};
