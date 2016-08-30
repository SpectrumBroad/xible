module.exports = function(flux) {

	function constructorFunction(NODE) {

		//makes this module only work with glow
		//Light = app.Light;

		let glowIn = NODE.addInput('glowServer', {
			type: "glowServer"
		});

		let nameIn = NODE.addInput('name', {
			type: "string",
			description: "The registered name of the light in Glow. If multiple names are given, multiple lights will be returned through the 'light' output."
		});

		nameIn.on('editorAttach', function() {
			this.node.getElementsByTagName('input')[0].style.display = 'none';
		});

		nameIn.on('editorDetach', function() {
			if (!this.connectors.length) {
				this.node.getElementsByTagName('input')[0].style.display = '';
			}
		});

		let lightOut = NODE.addOutput('light', {
			type: "glowLight",
			description: "One or more lights to return."
		});

		lightOut.on('trigger', callback => {

			if (nameIn.connectors.length) {
				flux.Node.getValuesFromInput(nameIn).then(strs => callback(strs.map(str => Light.getByName(str))));
			} else {
				callback(Light.getByName(this.value));
			}

		});

	}

	flux.addNode('light', {
		type: "object",
		level: 0,
		groups: ["glow"],
		editorContent: `<input data-hideifattached="input[name=name]" data-outputvalue="value" type="text" placeholder="name"/>`
	}, constructorFunction);

};
