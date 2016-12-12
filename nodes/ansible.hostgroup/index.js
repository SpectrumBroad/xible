module.exports = function(XIBLE) {

	function constr(NODE) {

		let varIn = NODE.addInput('variables', {
			type: "variable"
		});

		let hostOut = NODE.addOutput('hostgroup', {
			type: "ansible.hostgroup"
		});

		hostOut.on('trigger', (conn, state, callback) => {

			NODE.getValuesFromInput(varIn, state).then((vars) => {

				callback({
					variables: vars,
					groupName: NODE.data.groupName
				});

			});

		});

	}

	XIBLE.addNode('ansible.hostgroup', {
		type: "object",
		level: 0,
		description: 'Specifies a hostgroup as defined in the host inventory.'
	}, constr);

};
