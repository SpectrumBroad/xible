module.exports = function(FLUX) {

	function constr(NODE) {

		let triggerIn = NODE.addInput('trigger', {
			type: "trigger"
		});

		let hostIn = NODE.addInput('hosts', {
			type: "ansible.host"
		});

		let triggerOut = NODE.addOutput('done', {
			type: "trigger"
		});

		triggerIn.on('trigger', (conn, state) => {

			NODE.getValuesFromInput(hostIn, state).then((hosts) => {

				hosts.forEach((host) => {

				});

				FLUX.Node.triggerOutputs(triggerOut, state);

			});

		});

	}

	FLUX.addNode('ansible.service', {
		type: "action",
		level: 0,
		description: 'Controls services on remote hosts.'
	}, constr);

};
