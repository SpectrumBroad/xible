module.exports = function(XIBLE) {

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

				XIBLE.Node.triggerOutputs(triggerOut, state);

			});

		});

	}

	XIBLE.addNode('ansible.template', {
		type: "action",
		level: 0,
		description: 'Templates are processed by the Jinja2 templating language.'
	}, constr);

};
