module.exports = function(flux) {

	function constr(NODE) {

		let triggerIn = NODE.addInput('trigger', {
			type: "trigger"
		});

		let msecIn = NODE.addInput('msecs', {
			type: "math.number"
		});

		let triggerOut = NODE.addOutput('done', {
			type: "trigger"
		});

		triggerIn.on('trigger', (state) => {

			let delayFunction = (statusId) => {

				NODE.removeStatusById(statusId);
				flux.Node.triggerOutputs(triggerOut, state);

			};

			flux.Node.getValuesFromInput(msecIn, state).then(delays => {

				if (!delays.length) {
					delays.push(NODE.data.delay || 0);
				}

				delays.forEach(delay => {

					var statusId = NODE.addStatus({
						message: `waiting for ${delay} msec`,
						color: 'blue'
					});

					setTimeout(delayFunction.bind(NODE, statusId), delay);

				});

			});

		});

	}

	flux.addNode('delay', {
		type: "action",
		level: 0,
		groups: ["basics", "datetime"],
		editorContent: `<input type="number" placeholder="msecs" data-outputvalue="delay" data-hideifattached="input[name=msecs]"/>`
	}, constr);

};
