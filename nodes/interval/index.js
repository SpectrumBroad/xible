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

		triggerIn.on('trigger', (conn, state) => {

			flux.Node.getValuesFromInput(msecIn, state).then(intervals => {

				if (!intervals.length) {
					intervals.push(NODE.data.interval || 0);
				}

				intervals.forEach(interval => {

					setInterval(() => {
						flux.Node.triggerOutputs(triggerOut, state);
					}, interval);

				});

			});

		});

	}

	flux.addNode('interval', {
		type: "action",
		level: 0,
		groups: ["basics", "datetime"],
		editorContent: `<input type="number" placeholder="msecs" data-outputvalue="interval" data-hideifattached="input[name=msecs]"/>`
	}, constr);

};
