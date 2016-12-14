module.exports = function(XIBLE) {

	function constr(NODE) {

		let triggerIn = NODE.addInput('trigger', {
			type: "trigger"
		});

		let ansibleIn = NODE.addInput('ansible', {
			type: "ansible"
		});

		let hostIn = NODE.addInput('hostgroup', {
			type: "ansible.hostgroup"
		});

		let cmdIn = NODE.addInput('command', {
			type: "string"
		});

		let triggerOut = NODE.addOutput('done', {
			type: "trigger"
		});

		let failOut = NODE.addOutput('fail', {
			type: "trigger"
		});

		triggerIn.on('trigger', (conn, state) => {

			if (!NODE.data.cmd || !hostIn.isConnected() || !ansibleIn.isConnected()) {
				return;
			}

			NODE.getValuesFromInput(ansibleIn, state).then((ansibles) => {

				NODE.getValuesFromInput(hostIn, state).then((hosts) => {

					ansibles.forEach((ansible) => {

						hosts.forEach((host) => {

							let cmd = ansible.module('shell').hosts(host.groupName).args(NODE.data.cmd);

							cmd.on('stdout', (data) => {

								data = data.toString();
								if (!data) {
									return;
								}

								NODE.addStatus({
									message: data,
									timeout: 5000,
									color: data.indexOf('| success ') > -1 ? 'green' : null,
								});

							});
							cmd.on('stderr', (data) => {

								data = data.toString();
								if (!data) {
									return;
								}

								NODE.addStatus({
									message: data.toString(),
									timeout: 5000,
									color: 'red'
								});

							});
							cmd.exec().then(() => {
								XIBLE.Node.triggerOutputs(triggerOut, state);
							});

						});

					});

				});

			});

		});

	}

	XIBLE.addNode('ansible.shell', {
		type: "action",
		level: 0,
		description: 'Runs the given command through a shell on the remote node.'
	}, constr);

};
