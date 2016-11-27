module.exports = function(FLUX) {

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

			NODE.getValuesFromInput(hostIn, state).then((hosts) => {

				hosts.forEach((host) => {

				});

				FLUX.Node.triggerOutputs(triggerOut, state);

			});

		});

	}

	FLUX.addNode('ansible.file', {
		type: "action",
		level: 0,
		groups: ["ansible"],
		editorContent: `<input type="text" placeholder="path" data-outputvalue="path" data-hideifattached="input[name=path]" /><select name="state"><option>file</option><option>directory</option></select><input type="text" placeholder="owner" data-outputvalue="owner" /><input type="text" placeholder="group" data-outputvalue="group" /><input type="text" placeholder="permissions" data-outputvalue="permissions" />`
	}, constr);

};
