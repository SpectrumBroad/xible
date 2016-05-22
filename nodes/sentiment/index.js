var sentiment = require('sentiment');


module.exports = function(flux) {

	var constructorFunction = function() {

		var node = new flux.Node({
			name: "sentiment",
			type: "object",
			level: 0,
			groups: ["social"]
		});

		node.addInput({
			name: "string",
			type: "string"
		});

		var scoreOut = node.addOutput({
			name: "score",
			type: "number"
		});

		scoreOut.on('trigger', function(callback) {

			flux.Node.getValuesFromInput(this.node.inputs[0], strs => {

				var results=[];

				if (strs.length) {

					strs.forEach(str => {
						results.push(sentiment(str).score);
					});

				}

				callback(results);

			});

		});

		return node;

	};

	flux.addNode('sentiment', constructorFunction);

};
