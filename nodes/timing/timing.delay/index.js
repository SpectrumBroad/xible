module.exports = function(NODE) {

	let triggerIn = NODE.getInputByName('trigger');
	let msecIn = NODE.getInputByName('msecs');

	let triggerOut = NODE.getOutputByName('done');

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

				setTimeout(() => triggerOut.trigger(state), delay);

			});

		});

	});

};
