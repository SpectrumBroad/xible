module.exports = function(NODE) {

	let triggerIn = NODE.getInputByName('trigger');
	let swIn = NODE.getInputByName('switch');
	let stateIn = NODE.getInputByName('state');

	let doneOut = NODE.getOutputByName('done');

	triggerIn.on('trigger', (conn, state) => {

		swIn.getValues(state).then((sws) => {

			stateIn.getValues(state).then((states) => {

				let switchState = NODE.data.state === 'true';
				if (states.length) {
					switchState = states.indexOf(false) === -1;
				}

				Promise.all(sws.map((sw) => sw.connected && (switchState ? sw.switchOn() : sw.switchOff())))
					.then(() => doneOut.trigger(state));

			});

		});

	});

};
