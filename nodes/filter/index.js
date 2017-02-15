module.exports = function(NODE) {

	let anyIn = NODE.getInputByName('any');
	let boolIn = NODE.getInputByName('condition');

	let filteredOut = NODE.getOutputByName('filtered');
	filteredOut.on('trigger', (conn, state, callback) => {

		anyIn.getValues(state).then((values) => {

			boolIn.getValues(state).then((conditions) => {

				if (conditions.indexOf(false) === -1) {
					callback(values);
				}

			});

		});

	});

	let droppedOut = NODE.getOutputByName('dropped');
	droppedOut.on('trigger', (conn, state, callback) => {

		anyIn.getValues(state).then((values) => {

			boolIn.getValues(state).then((conditions) => {

				if (conditions.indexOf(true) === -1) {
					callback(values);
				}

			});

		});

	});

};
