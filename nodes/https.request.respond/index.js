module.exports = function(XIBLE) {

	function constr(NODE) {

		let triggerIn = NODE.addInput('trigger', {
			type: "trigger"
		});

		let reqIn = NODE.addInput('request', {
			type: "http.request"
		});

		let resIn = NODE.addInput('response', {
			type: "string"
		});

		let doneOut = NODE.addOutput('done', {
			type: "trigger"
		});

		triggerIn.on('trigger', (conn, state) => {

			NODE.getValuesFromInput(reqIn, state).then((reqs) => {

				if (!reqs.length) {
					return;
				}

				NODE.getValuesFromInput(resIn, state).then((ress) => {

					reqs.forEach((req) => {

						if (req && req.res) {

							req.res.status(NODE.data.status || 200).send(ress.join(''));
							XIBLE.Node.triggerOutputs(doneOut, state);

						}

					});



				});

			});

		});

	}

	XIBLE.addNode('https.request.respond', {
		type: "action",
		level: 0,
		description: `Responds to a HTTP request.`
	}, constr);

};
