module.exports = function(FLUX) {

	function constr(NODE) {

		let triggerIn = NODE.addInput('trigger', {
			type: "trigger"
		});

		let doneOut = NODE.addOutput('done', {
			type: "trigger"
		});

		triggerIn.on('trigger', (conn, state) => {

//TODO: fix this
//doesn't work because in the clustered thread, only the current flow exists in FLUX.flows
//need to push something to master for this to work
			let flow = FLUX.getFlowById(NODE.data.flowName);
			if (flow) {

				flow.start().then(() => {
					FLUX.Node.triggerOutputs(doneOut, state);
				});

			}

		});

	}

	FLUX.addNode('flux.flow.start', {
		type: "action",
		level: 0,
		groups: ["xible"]
	}, constr);

};
