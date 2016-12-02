module.exports = function(FLUX) {

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
							FLUX.Node.triggerOutputs(doneOut, state);

						}

					});



				});

			});

		});

	}

	FLUX.addNode('http.request.respond', {
		type: "action",
		level: 0,
		groups: ["http"]
	}, constr);

};
