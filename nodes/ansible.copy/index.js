module.exports = function(FLUX) {

	function constr(NODE) {

		let triggerIn = NODE.addInput('trigger', {
			type: "trigger"
		});

		let hostIn = NODE.addInput('hosts', {
			type: "ansible.host"
		});

    let origPathIn = NODE.addInput('origin', {
      type: "string"
    });

    let destPathIn = NODE.addInput('destination', {
      type: "string"
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

	FLUX.addNode('ansible.copy', {
		type: "action",
		level: 0,
		description: 'Copies a file on the local box to remote locations.'
	}, constr);

};
