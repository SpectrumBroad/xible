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

			if (!hostIn.isConnected() || !ansibleIn.isConnected()) {
				return;
			}

			Promise.all([ansibleIn.getValues(state), hostIn.getValues(state), cmdIn.getValues(state)])
				.then(([ansibles, hosts, cmds]) => {

					if (!cmds.length) {
						cmds = [NODE.data.cmd];
					}

					return Promise.all(ansibles.map((ansible) => {

						return Promise.all(hosts.map((host) => {

							let cmd = ansible.module('shell').hosts(host.groupName).args(NODE.data.cmd);

							cmd.on('stdout', (data) => {

								data = data.toString();
								if (!data || !data.replace(/[\r\n]/g, '').trim()) {
									return;
								}

								//let this be handlded by the generic fail handler
								if (data.indexOf('| FAILED ') > -1) {
									return;
								}

								NODE.addStatus({
									message: data,
									timeout: 5000,
									color: data.indexOf('| FAILED ') > -1 ? 'red' : (data.indexOf('| success ') > -1 ? 'green' : null),
								});

							});

							return cmd.exec();

						}));

					}));

				}).then(() => {
					XIBLE.Node.triggerOutputs(triggerOut, state);
				}).catch((err) => {

					NODE.addStatus({
						message: err.toString(),
						timeout: 5000,
						color: 'red'
					});

					XIBLE.Node.triggerOutputs(failOut, state);

				});

		});

	}

	XIBLE.addNode('ansible.shell', {
		type: "action",
		level: 0,
		description: 'Runs the given command through a shell on the remote node.'
	}, constr);

};
