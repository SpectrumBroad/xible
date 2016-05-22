module.exports = function(flux) {

	var constructorFunction = function() {

		var node = new flux.Node({
			name: "string",
			type: "object",
			level: 0,
			groups: ["basics"],
			editorContent: `<input type="text" data-outputvalue="value" />`
		});

		var concatIn = node.addInput({
			name: "concat",
			type: "string"
		});

		var stringOut = node.addOutput({
			name: "string",
			type: "string"
		});

		stringOut.on('trigger', function(callback) {

			flux.Node.getValuesFromInput(this.node.inputs[0], strs => {

				var concatStr = '';
				strs.forEach(str => {
					concatStr += str;
				});

				callback(concatStr + (this.node.data.value || ''));

			});
		});

		return node;

	};

	flux.addNode('string', constructorFunction);

};
