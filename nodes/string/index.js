module.exports = function(FLUX) {

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

	FLUX.addNode('string', {
		type: "object",
		level: 0,
		groups: ["basics"],
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
