module.exports = function(flux) {

	function constructorFunction(NODE) {

		NODE.on('editorContentLoad', function() {
			let castTypeSelect=this.getElementsByTagName('selectcontainer')[0].firstChild;
			castTypeSelect.onchange = () => {
				this.getOutputByName('result').setType(castTypeSelect.value);
			};
		});

		var anyInput = NODE.getInputByName('in');
		anyInput.on('editorAttach', function(connector) {
			this.setType(connector.origin.type);
		});

		anyInput.on('editorDetach', function() {

			if (!this.connectors.length) {
				this.setType(null);
			}

		});

		var anyOutput = NODE.getOutputByName('result');
		anyOutput.on('trigger', function(callback) {

			//get the input values
			flux.Node.getValuesFromInput(anyInput, vals => {

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

	}

	flux.addNode('cast', {
		type: "object",
		level: 0,
		groups: ["basics"],
		editorContent: '<selectcontainer><select data-outputvalue="castType"><option selected>string</option><option>boolean</option><option>number</option><option>date</option><option>time</option></select></selectcontainer>',
		inputs: {
			"in": {}
		},
		outputs: {
			"result": {
				type: "string"
			}
		}
	}, constructorFunction);

};
