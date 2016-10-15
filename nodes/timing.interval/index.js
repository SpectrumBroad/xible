module.exports = function(FLUX) {

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

		let regIntervals = [];
		triggerIn.on('trigger', (conn, state) => {

			let intervalFunction = (interval, fromData) => {

				NODE.addProgressBar({
					message: (fromData ? null : `waiting for ${interval} msec`),
					percentage: 0,
					updateOverTime: interval,
					timeout: interval + 700
				});
				FLUX.Node.triggerOutputs(triggerOut, state);

			};

			FLUX.Node.getValuesFromInput(msecIn, state).then((intervals) => {

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

					regIntervals.push(setInterval(() => intervalFunction(interval, fromData), interval));

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

	FLUX.addNode('timing.interval', {
		type: "action",
		level: 0,
		groups: ["timing"],
		editorContent: `<input type="number" placeholder="msecs" data-outputvalue="interval" data-hideifattached="input[name=msecs]"/>`
	}, constr);

};
