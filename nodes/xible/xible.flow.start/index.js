module.exports = function(NODE) {

	let triggerIn = NODE.getInputByName('trigger');
	let doneOut = NODE.getOutputByName('done');

	triggerIn.on('trigger', (conn, state) => {

		let flowId = NODE.data.flowName;

		let messageHandler = (message) => {

			if (message.flowId !== flowId) {
				return;
			}

			switch (message.method) {

				case 'flowStarted':
					doneOut.trigger(state);
					break;

				case 'flowNotExist':
					NODE.addStatus({
						message: `flow does not exist`,
						color: 'red'
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

};
