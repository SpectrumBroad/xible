module.exports = function(FLUX) {

	function constr(NODE) {

		NODE.on('editorContentLoad', function() {
			let castTypeSelect = this.getElementsByTagName('selectcontainer')[0].firstChild;
			castTypeSelect.onchange = () => {
				this.getOutputByName('result').setType(castTypeSelect.value);
			};
		});

		var valuesIn = NODE.getInputByName('values');
		var anyOut = NODE.getOutputByName('result');
		anyOut.on('trigger', (conn, state, callback) => {

			//get the input values
			FLUX.Node.getValuesFromInput(valuesIn, state).then((vals) => {

				let values = [];
				vals.forEach(val => {

					switch (NODE.data.castType) {

						case 'string':
							values.push('' + val);
							break;

						case 'math.number':
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

	FLUX.addNode('cast', {
		type: "object",
		level: 0,
		groups: ["basics"],
		editorContent: '<selectcontainer><select data-outputvalue="castType"><option selected>string</option><option>boolean</option><option>math.number</option><option>date</option><option>time</option></select></selectcontainer>',
		inputs: {
			"values": {}
		},
		outputs: {
			"result": {
				type: "string"
			}
		}
	}, constr);

};
