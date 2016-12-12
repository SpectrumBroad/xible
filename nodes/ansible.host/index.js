module.exports = function(FLUX) {

	function constr(NODE) {

		let varIn = NODE.addInput('variables', {
			type: "variable"
		});

		let hostOut = NODE.addOutput('host', {
			type: "ansible.host"
		});

		hostOut.on('trigger', (conn, state, callback) => {

			NODE.getValuesFromInput(varIn, state).then((vars) => {

				callback({
					variables: vars,
					hostname: NODE.data.hostname
				});

			});

		});

	}

	FLUX.addNode('ansible.host', {
		type: "object",
		level: 0,
		description: 'Specifies a remote host to address. In Ansible you would find these in the hosts.ini.'
	}, constr);

};
