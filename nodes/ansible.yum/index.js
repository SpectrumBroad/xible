module.exports = function(XIBLE) {

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

			hostIn.getValues(state).then((hosts) => {

				hosts.forEach((host) => {

				});

				XIBLE.Node.triggerOutputs(triggerOut, state);

			});

		});

	}

	XIBLE.addNode('ansible.yum', {
		type: "action",
		level: 0,
		description: 'Install, upgrade, removes and lists packages and groups with the yum package manager.'
	}, constr);

};
