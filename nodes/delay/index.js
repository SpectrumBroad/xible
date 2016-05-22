module.exports = function(flux) {

	var nodeConstructor = function() {

		var node = new flux.Node({
			name: "delay",
			type: "action",
			level: 0,
			groups: ["basics", "datetime"],
			editorContent: `<input type="number" placeholder="msecs" data-outputvalue="delay" data-hideifattached="input[name=msecs]"/>`
		});

		var triggerIn = node.addInput({
			name: "trigger",
			type: "trigger"
		});

		triggerIn.on('trigger', function() {

			var delayFunction = (statusId) => {

				this.node.removeStatusById(statusId);
				flux.Node.triggerOutputs(this.node.outputs[0]);

			};

			flux.Node.getValuesFromInput(this.node.inputs[1], delays => {

				if (!delays.length) {
					delays.push(this.node.data.delay || 0);
				}

				delays.forEach(delay => {

					var statusId = this.node.addStatus({
						message: `waiting for ${delay} msec`,
						color: 'blue'
					});

					setTimeout(delayFunction.bind(this, statusId), delay);

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

	flux.addNode('delay', nodeConstructor);

};
