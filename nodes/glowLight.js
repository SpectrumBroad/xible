module.exports = function(flux) {

	var constructorFunction = function() {

		//makes this module only work with glow
		//Light = app.Light;

		var node = new flux.Node({
			name: "light",
			type: "object",
			level: 0,
			groups: ["glow"],
			editorContent: `<input data-hideifattached="input[name=name]" data-outputvalue="value" type="text" placeholder="name"/>`
		});

		var nameInput = node.addInput({
			name: "name",
			type: "string",
			description: "The registered name of the light in Glow. If multiple names are given, multiple lights will be returned through the 'light' output."
		});

		nameInput.on('editorAttach', function() {
			this.node.content.getElementsByTagName('input')[0].style.display = 'none';
		});

		nameInput.on('editorDetach', function() {
			if (!this.connectors.length) {
				this.node.content.getElementsByTagName('input')[0].style.display = '';
			}
		});

		var lightOutput = node.addOutput({
			name: "light",
			type: "glowLight",
			description: "One or more lights to return."
		});

		lightOutput.on('trigger', callback => {

			if (this.node.inputs[0].connectors.length) {
				flux.Node.getValuesFromInput(this.node.inputs[0], strs => callback(strs.map(str => Light.getByName(str))));
			} else {
				callback(Light.getByName(this.value));
			}

		});

		return node;

	};

	flux.addNode('light', constructorFunction);

};
