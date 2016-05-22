module.exports = function(flux) {

	var constructorFunction = function() {

		var node = new flux.Node({
			name: "multiply",
			type: "object",
			level: 0,
			groups: ["math"],
			editorContent: '<input type="number" placeholder="multiplier" value="0" data-outputvalue="value" data-hideifattached="input[name=multiplier]"/>'
		});

		node.addInput({
			name: 'multiplicand',
			type: 'number'
		});

		node.addInput({
			name: 'multiplier',
			type: 'number'
		});

		var numberOut = node.addOutput({
			name: "result",
			type: "number"
		});

		numberOut.on('trigger', function(callback) {

			flux.Node.getValuesFromInput(this.node.inputs[0], multiplicands => {

				flux.Node.getValuesFromInput(this.node.inputs[1], multipliers => {

          //get the multiplier
          //if multiply multipliers given, we take the first one only
					var multiplier;
					if (multipliers.length) {
						multiplier = multipliers[0];
					} else {
						multiplier = this.node.data.value || 0;
					}

          //take all mutiplicans times the multiplier and output them
					var result = [];
					multiplicands.forEach(multiplicand => {
						result.push(multiplicand * multiplier);
					});

					callback(result);

				});

			});

		});

		return node;

	};

	flux.addNode('multiply', constructorFunction);

};
