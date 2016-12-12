module.exports = function(FLUX) {

	function constr(NODE) {

		let triggerIn = NODE.addInput('trigger', {
			type: "trigger"
		});

		let hostIn = NODE.addInput('hosts', {
			type: "ansible.host"
		});

    let cmdIn = NODE.addInput('command', {
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

	FLUX.addNode('ansible.shell', {
		type: "action",
		level: 0,
		description: 'Runs the given command through a shell on the remote node.'
	}, constr);

};
