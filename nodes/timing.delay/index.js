module.exports = function(XIBLE) {

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

		triggerIn.on('trigger', (conn, state) => {

			msecIn.getValues(state).then(delays => {

				let fromData = false;
				if (!delays.length) {

					fromData = true;
					delays.push(NODE.data.delay || 0);

				}

				delays.forEach((delay) => {

					delay = Math.round(delay);

					let statusId = NODE.addProgressBar({
						message: (fromData ? null : `waiting for ${delay} msec`),
						percentage: 0,
						updateOverTime: delay,
						timeout: delay + 700
					});

					setTimeout(() => XIBLE.Node.triggerOutput(triggerOut, state), delay);

				});

			});

		});

	}

	XIBLE.addNode('timing.delay', {
		type: "action",
		level: 0,
		description: `Waits the given time in milliseconds before triggering the output.`
	}, constr);

};
