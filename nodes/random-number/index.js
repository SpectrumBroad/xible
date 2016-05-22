module.exports = function(flux) {

	var constructorFunction = function() {

		var node = new flux.Node({
			name: "random number",
			type: "object",
			level: 0,
			groups: ["math"]
		});

		var numberOut = node.addOutput({
			name: "number",
			type: "number"
		});

		numberOut.on('trigger', function(callback) {
			callback(Math.random());
		});

		return node;

	};

	flux.addNode('random number', constructorFunction);

};
