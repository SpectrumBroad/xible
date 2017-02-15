module.exports = function(NODE) {

	let triggerIn = NODE.getInputByName('trigger');
	let clearIn = NODE.getInputByName('clear');
	let msecIn = NODE.getInputByName('msecs');

	let doneOut = NODE.getOutputByName('done');

	let intervalFunction = (state, interval, fromData) => {

		NODE.addProgressBar({
			message: (fromData ? null : `waiting for ${interval} msec`),
			percentage: 0,
			updateOverTime: interval,
			timeout: interval + 700
		});
		doneOut.trigger(state);

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

		//TODO: clear progress bars as well
		regIntervals.forEach((regInterval) => {
			clearInterval(regInterval);
		});
		regIntervals = [];

	});

};
