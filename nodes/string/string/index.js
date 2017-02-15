module.exports = function(NODE) {

	let stringOut = NODE.getOutputByName('result');
	stringOut.on('trigger', (conn, state, callback) => {

		NODE.getInputByName('concat').getValues(state).then(strs => {

			let concatStr;
			if (strs.length) {

				let concatStr = strs.reduce((prevVal, currentVal) => prevVal + currentVal);
				callback(concatStr + (NODE.data.value || ''));

			} else {
				callback(NODE.data.value || '');
			}

		});

	});

};
