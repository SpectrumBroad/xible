module.exports = function(NODE) {

	let triggerIn = NODE.getInputByName('trigger');
	let hostIn = NODE.getInputByName('hostgroup');
	let origPathIn = NODE.getInputByName('origin');
	let destPathIn = NODE.getInputByName('destination');

	let triggerOut = NODE.getOutputByName('done');

	triggerIn.on('trigger', (conn, state) => {

		hostIn.getValues(state).then((hosts) => {

			hosts.forEach((host) => {

			});

			triggerOut.trigger(state);

		});

	});

};
