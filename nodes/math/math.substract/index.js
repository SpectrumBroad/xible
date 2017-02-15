module.exports = function(NODE) {

	let resultOut = NODE.getOutputByName('result');
	resultOut.on('trigger', (conn, state, callback) => {

		NODE.getInputByName('a').getValues(state).then((aNumbers) => {

			NODE.getInputByName('b').getValues(state).then((bNumbers) => {

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

};
