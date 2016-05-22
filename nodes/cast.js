module.exports = function(flux) {

	var constructorFunction = function() {

		var node = new flux.Node({
			name: "cast",
			type: "object",
			level: 0,
			groups: ["basics"],
			editorContent: '<selectcontainer><select data-outputvalue="castType"><option selected>string</option><option>boolean</option><option>number</option><option>date</option><option>time</option></select></selectcontainer>'
		});

		node.on('editorContentLoad', function() {
			var self = this;
			this.getElementsByTagName('selectcontainer')[0].firstChild.onchange = function() {
				self.outputs[0].setType(this.value).setName(this.value);
			};
		});

		var anyInput = node.addInput({
			name: "any"
		});

		anyInput.on('attach', function(connector) {

			var type = connector.origin.type;
			this.setType(connector.origin.type).setName(type);

		});

		anyInput.on('detach', function() {

			if (!this.connectors.length) {
				this.setType(null).setName('any');
			}

		});

		var anyOutput = node.addOutput({
			name: "string",
			type: "string"
		});

		anyOutput.on('trigger', function(callback) {

			//get the input values
			flux.Node.getValuesFromInput(this.node.inputs[0], vals => {

				var values = [];
				vals.forEach(val => {

					switch (this.node.data.castType) {

						case 'string':
							values.push('' + val);
							break;

						case 'number':
							values.push(+val);
							break;

						case 'boolean':
							values.push(!!val);
							break;

						case 'date':
							values.push(new Date(val));
							break;

						case 'time':
							values.push(new Date(val));
							value.setFullYear(0, 0, 1);
							break;

					}

				});

				callback(values);

			});

		});

		return node;

	};

	flux.addNode('cast', constructorFunction);

};
