module.exports = function(flux) {

	var constructorFunction = function() {

		var node = new flux.Node({
			name: "sum",
			type: "object",
			level: 0,
			groups: ["math"]
		});

		node.addInput({
			name: "values",
			type: "number"
		});

		var resultOut = node.addOutput({
			name: "result",
			type: "number"
		});

		resultOut.on('trigger', function(callback) {

			flux.Node.getValuesFromInput(this.node.inputs[0], numbers => {

				var result = 0;
				numbers.forEach(number => result += number);

				callback(result);

			});

		});

		return node;

	};

	flux.addNode('sum', constructorFunction);

};
