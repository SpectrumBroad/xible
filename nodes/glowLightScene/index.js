module.exports = function(flux) {

	function constructorFunction(NODE) {

		NODE.on('editorContentLoad', function() {
			Scene.getAll(scenes => {

				let datalist = this.appendChild(document.createElement('datalist'));
				datalist.setAttribute('id', 'test');
				this.getElementsByTagName('input')[0].setAttribute('list', 'test');
				scenes.forEach(scene => {
					datalist.appendChild(document.createElement('option')).setAttribute('value', scene.name);
				});

			});
		});

		let glowIn = NODE.addInput('glowServer', {
			type: "glowServer"
		});

		let sceneIn = NODE.addInput('scene', {
			type: "string"
		});

		let sceneOut = NODE.addOutput('scene', {
			type: "glowLightScene"
		});

		sceneOut.on('trigger', function(callback) {

			if (stringInput.connectors.length) {
				this.getValuesFromInput(sceneIn, strs => callback(strs.map(str => LightScene.getByName(str))));
			} else {
				callback(LightScene.getByName(this.value));
			}

		});

	}

	flux.addNode('light scene', {
		type: "object",
		level: 0,
		groups: ["glow"],
		description: "A Glow light scene.",
		editorContent: `<input type="text" placeholder="Light scene" data-hideifattached="input[name=scene]" data-outputvalue="value"/>`
	}, constructorFunction);

};
