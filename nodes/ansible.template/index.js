module.exports = function(FLUX) {

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

			FLUX.Node.getValuesFromInput(hostIn, state).then((hosts) => {

				hosts.forEach((host) => {

				});

				FLUX.Node.triggerOutputs(triggerOut, state);

			});

		});

	}

	FLUX.addNode('ansible.template', {
		type: "action",
		level: 0,
		groups: ["ansible"],
		editorContent: `<input type="text" placeholder="origin path" data-outputvalue="origPath" data-hideifattached="input[name=origin]" /><input type="text" placeholder="destination path" data-outputvalue="destPath" data-hideifattached="input[name=destination]" />`
	}, constr);

};
