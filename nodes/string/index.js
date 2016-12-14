module.exports = function(XIBLE) {

	function constr(NODE) {

		let stringOut = NODE.getOutputByName('result');
		stringOut.on('trigger', (conn, state, callback) => {

			NODE.getValuesFromInput(NODE.getInputByName('concat'), state).then(strs => {

				let concatStr;
				if(strs.length) {

					let concatStr = strs.reduce((prevVal, currentVal) => prevVal + currentVal);
					callback(concatStr + (NODE.data.value || ''));

				} else {
					callback(NODE.data.value || '');
				}

			});

		});

	}

	XIBLE.addNode('string', {
		type: "object",
		level: 0,
		description: `A string representation.`,
		inputs: {
			"concat": {
				type: "string"
			}
		},
		outputs: {
			"result": {
				type: "string"
			}
		}
	}, constr);

};
