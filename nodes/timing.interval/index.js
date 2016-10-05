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

			FLUX.Node.getValuesFromInput(msecIn, state).then((intervals) => {

				if (!intervals.length) {
					intervals.push(NODE.data.interval || 0);
				}

				intervals.forEach(interval => {

					regIntervals.push(setInterval(() => {
						FLUX.Node.triggerOutputs(triggerOut, state);
					}, interval));

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
