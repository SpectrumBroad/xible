module.exports = function(flux) {

	var constructorFunction = function() {

		var node = new flux.Node({
			name: "string concat",
			type: "object",
			level: 0,
			groups: ["basics"]
		});

		node.addInput({
			name: "a",
			type: "string"
		});

		node.addInput({
			name: "b",
			type: "string"
		});

		var stringOut = node.addOutput({
			name: "string",
			type: "string"
		});

		stringOut.on('trigger', function(callback) {

			flux.Node.getValuesFromInput(this.node.inputs[0], strsa => {

				flux.Node.getValuesFromInput(this.node.inputs[1], strsb => {

					var result = '';
					if (strsa.length) {

						strsa.forEach(str => {
							result += str;
						});

					}

					if (strsb.length) {

						strsb.forEach(str => {
							result += str;
						});

					}

					callback(result);

				});

			});

		});

		return node;

	};

	flux.addNode('string concat', constructorFunction);

};
