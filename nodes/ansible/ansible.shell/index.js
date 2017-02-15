module.exports = function(NODE) {

	let triggerIn = NODE.getInputByName('trigger');
	let ansibleIn = NODE.getInputByName('ansible');
	let hostIn = NODE.getInputByName('hostgroup');
	let cmdIn = NODE.getInputByName('command');

	let triggerOut = NODE.getOutputByName('done');

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
				triggerOut.trigger(state);
			}).catch((err) => {

				err = err.toString();

				NODE.addStatus({
					message: err,
					timeout: 5000,
					color: 'red'
				});

				NODE.fail(err, state);

			});

	});

};
