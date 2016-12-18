module.exports = function(XIBLE) {

	function constr(NODE) {

		let triggerIn = NODE.addInput('trigger', {
			type: "trigger"
		});

		let hostIn = NODE.addInput('hosts', {
			type: "ansible.host"
		});

    let pathIn = NODE.addInput('path', {
      type: "string"
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

	XIBLE.addNode('ansible.file', {
		type: "action",
		level: 0,
		description: 'Sets attributes of files, symlinks, and directories, or removes files/symlinks/directories.'
	}, constr);

};
