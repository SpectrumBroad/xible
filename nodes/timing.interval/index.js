module.exports = function(XIBLE) {

	function constr(NODE) {

		let triggerIn = NODE.addInput('trigger', {
			type: "trigger"
		});

		let clearIn = NODE.addInput('clear', {
			type: "trigger"
		});

		let msecIn = NODE.addInput('msecs', {
			type: "math.number"
		});

		let triggerOut = NODE.addOutput('done', {
			type: "trigger"
		});

		let intervalFunction = (state, interval, fromData) => {

			NODE.addProgressBar({
				message: (fromData ? null : `waiting for ${interval} msec`),
				percentage: 0,
				updateOverTime: interval,
				timeout: interval + 700
			});
			XIBLE.Node.triggerOutputs(triggerOut, state);

		};

		let regIntervals = [];
		triggerIn.on('trigger', (conn, state) => {

			msecIn.getValues(state).then((intervals) => {

				let fromData = false;
				if (!intervals.length) {

					fromData = true;
					intervals.push(NODE.data.interval || 0);

				}

				intervals.forEach((interval) => {

					interval = Math.round(interval);

					NODE.addProgressBar({
						message: (fromData ? null : `waiting for ${interval} msec`),
						percentage: 0,
						updateOverTime: interval,
						timeout: interval + 700
					});

					regIntervals.push(setInterval(() => intervalFunction(state, interval, fromData), interval));

				});

			});

		});

		clearIn.on('trigger', (conn, state) => {

			regIntervals.forEach((regInterval) => {
				clearInterval(regInterval);
			});
			regIntervals = [];

		});

	}

	XIBLE.addNode('timing.interval', {
		type: "action",
		level: 0,
		description: `Triggers the output in an interval, every given x milliseconds.`
	}, constr);

};
