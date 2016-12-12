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

			if (!NODE.data.origPath || !NODE.data.destPath || !hostIn.isConnected() || !ansibleIn.isConnected()) {
				return;
			}

			NODE.getValuesFromInput(ansibleIn, state).then((ansibles) => {

				NODE.getValuesFromInput(hostIn, state).then((hosts) => {

					ansibles.forEach((ansible) => {

						hosts.forEach((host) => {

							let cmd = ansible.module('copy').hosts(host.groupName).args(`src=${NODE.data.origPath} dest=${NODE.data.destPath}`);

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

	XIBLE.addNode('ansible.copy', {
		type: "action",
		level: 0,
		description: 'Copies a file on the local box to remote locations.'
	}, constr);

};
