module.exports = function(flux) {

	var constructorFunction = function() {

		var node = new flux.Node({
			name: "number",
			type: "object",
			level: 0,
			groups: ["basics", "math"],
			editorContent: '<input type="number" value="0" data-outputvalue="value" />'
		});

		var numberOut = node.addOutput({
			name: "number",
			type: "number"
		});

		numberOut.on('trigger', function(callback) {
			callback(+(this.node.data.value || 0));
		});

		return node;

	};

	flux.addNode('number', constructorFunction);

};
