module.exports = function(flux) {

	var nodeConstructor = function() {

		var node = new flux.Node({
			name: "interval",
			type: "action",
			level: 0,
			groups: ["basics", "datetime"],
			editorContent: `<input type="number" placeholder="msecs" data-outputvalue="interval" data-hideifattached="input[name=msecs]"/>`
		});

		var triggerIn = node.addInput({
			name: "trigger",
			type: "trigger"
		});

		triggerIn.on('trigger', function() {

			flux.Node.getValuesFromInput(this.node.inputs[1], intervals => {

				if (!intervals.length) {
					intervals.push(this.node.data.interval || 0);
				}

				intervals.forEach(interval => {

					setInterval(() => {
						flux.Node.triggerOutputs(this.node.outputs[0]);
					}, interval);

				});

			});

		});

		node.addInput({
			name: "msecs",
			type: "number"
		});

		node.addOutput({
			name: "complete",
			type: "trigger"
		});

		return node;

	};

	flux.addNode('interval', nodeConstructor);

};
