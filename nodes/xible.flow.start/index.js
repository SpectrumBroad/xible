module.exports = function(XIBLE) {

	function constr(NODE) {

		let triggerIn = NODE.addInput('trigger', {
			type: "trigger"
		});

		let doneOut = NODE.addOutput('done', {
			type: "trigger"
		});

		triggerIn.on('trigger', (conn, state) => {

			let flowId = NODE.data.flowName;

			let messageHandler = (message) => {

				if (message.flowId !== flowId) {
					return;
				}

				switch (message.method) {

					case 'flowStarted':
						XIBLE.Node.triggerOutputs(doneOut, state);
						break;

					case 'flowNotExist':
						NODE.addStatus({
							message: `flow does not exist`,
							color: 'red',
							timeout: 5000
						});

						break;

					default:
						return;

				}

				process.removeListener('message', messageHandler);
				messageHandler = null;

			};

			process.on('message', messageHandler);

			process.send({
				method: 'startFlowById',
				flowId: flowId
			});

		});

	}

	XIBLE.addNode('xible.flow.start', {
		type: "action",
		level: 0,
		description: `Starts another flow.`
	}, constr);

};
