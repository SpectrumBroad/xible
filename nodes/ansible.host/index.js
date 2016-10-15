module.exports = function(FLUX) {

	function constr(NODE) {

		let varIn = NODE.addInput('variables', {
			type: "variable"
		});

		let hostOut = NODE.addOutput('host', {
			type: "ansible.host"
		});

		hostOut.on('trigger', (conn, state, callback) => {

			FLUX.Node.getValuesFromInput(varIn, state).then((vars) => {

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
		groups: ["ansible"],
		editorContent: `<input type="text" placeholder="hostname" data-outputvalue="hostname" />`
	}, constr);

};
