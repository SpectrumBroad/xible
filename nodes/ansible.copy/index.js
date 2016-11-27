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

			NODE.getValuesFromInput(hostIn, state).then((hosts) => {

				hosts.forEach((host) => {

				});

				FLUX.Node.triggerOutputs(triggerOut, state);

			});

		});

	}

	FLUX.addNode('ansible.copy', {
		type: "action",
		level: 0,
		groups: ["ansible"],
		editorContent: `<input type="text" placeholder="origin path" data-outputvalue="origPath" data-hideifattached="input[name=origin]" /><input type="text" placeholder="destination path" data-outputvalue="destPath" data-hideifattached="input[name=destination]" /><input type="text" placeholder="owner" data-outputvalue="owner" /><input type="text" placeholder="group" data-outputvalue="group" /><input type="text" placeholder="permissions" data-outputvalue="permissions" />`
	}, constr);

};
