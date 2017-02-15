module.exports = function(NODE) {

	let resultOut = NODE.getOutputByName('result');
	resultOut.on('trigger', (conn, state, callback) => {

		NODE.getInputByName('values').getValues(state).then((vals) => {

			let result = vals.reduce((prevVal, newVal) => {
				return +prevVal + newVal;
			}, 0);
			callback(result + (+NODE.data.value || 0));

		});

	});

};
