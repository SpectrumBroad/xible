module.exports = function(FLUX) {

	function constr(NODE) {

		let reqIn = NODE.addInput('request', {
			type: "http.request"
		});

		let valueOut = NODE.addOutput('value', {
			type: "string"
		});

		valueOut.on('trigger', (conn, state, callback) => {

			NODE.getValuesFromInput(reqIn, state).then((requests) => {

				requests.forEach((req) => {

					if (req && req.query && req.query[NODE.data.paramName]) {
						callback(req.query[NODE.data.paramName]);
					}

				});

			});

		});

	}

	FLUX.addNode('http.query', {
		type: "object",
		level: 0,
		groups: ["http"]
	}, constr);

};
