module.exports = function(NODE) {

	let reqIn = NODE.getInputByName('request');

	let valueOut = NODE.getOutputByName('value');
	valueOut.on('trigger', (conn, state, callback) => {

		reqIn.getValues(state).then((requests) => {

			requests.forEach((req) => {

				if (req && req.query && req.query[NODE.data.paramName]) {
					callback(req.query[NODE.data.paramName]);
				}

			});

		});

	});

};
