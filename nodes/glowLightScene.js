module.exports = function(flux) {

	var constructorFunction = function() {

		var node = new flux.Node({
			name: "light scene",
			type: "object",
			level: 0,
			groups: ["glow"],
			description: "A Glow light scene.",
			editorContent: `<input type="text" placeholder="Light scene" data-hideifattached="input[name=string]" data-outputvalue="value"/>`
		});

		node.on('editorContentLoad', function() {
			Scene.getAll(scenes => {

				var datalist = this.appendChild(document.createElement('datalist'));
				datalist.setAttribute('id', 'test');
				this.getElementsByTagName('input')[0].setAttribute('list', 'test');
				scenes.forEach(scene => {
					datalist.appendChild(document.createElement('option')).setAttribute('value', scene.name);
				});

			});
		});

		var stringInput = node.addInput({
			name: "string",
			type: "string"
		});

		stringInput.on('editorAttach', function() {
			this.action.inputs[1].hide();
		});

		stringInput.on('editorDetach', function() {
			this.action.inputs[1].unhide();
		});

		var lightInput = node.addInput({
			name: "light",
			type: "glowLight"
		});

		lightInput.on('editorAttach', function() {
			this.action.inputs[0].hide();
		});

		lightInput.on('editorDetach', function() {
			this.action.inputs[0].unhide();
		});

		var sceneOutput = node.addOutput({
			name: "scene",
			type: "glowLightScene"
		});

		sceneOutput.on('trigger', function(callback) {

			if (this.node.inputs[0].connectors.length) {
				this.getValuesFromInput(this.node.inputs[0], strs => callback(strs.map(str => LightScene.getByName(str))));
			} else {
				callback(LightScene.getByName(this.value));
			}
		});

		return node;

	};

	flux.addNode('light scene', constructorFunction);

};
