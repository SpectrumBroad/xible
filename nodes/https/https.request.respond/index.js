module.exports = function(NODE) {

	let triggerIn = NODE.getInputByName('trigger');
	let reqIn = NODE.getInputByName('request');
	let resIn = NODE.getInputByName('response');

	let doneOut = NODE.getOutputByName('done');

	triggerIn.on('trigger', (conn, state) => {

		reqIn.getValues(state).then((reqs) => {

			if (!reqs.length) {
				return;
			}

			resIn.getValues(state).then((ress) => {

				reqs.forEach((req) => {

					if (req && req.res) {

						req.res.status(NODE.data.status || 200).send(ress.join(''));
						doneOut.trigger(state);

					}

				});

			});

		});

	});

};
