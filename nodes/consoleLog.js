module.exports = function(flux) {

	var nodeConstructor = function() {

		var node = new flux.Node({
			name: "console log",
			type: "action",
			level: 0,
			groups: ["basics", "logging"],
			editorContent: `<input data-hideifattached="input[name=any]" data-outputvalue="value" type="text" placeholder="name"/>`
		});

		var triggerIn = node.addInput({
			name: "trigger",
			type: "trigger"
		});

		triggerIn.on('trigger', function() {

			flux.Node.getValuesFromInput(this.node.inputs[1], strs => {

				if (!strs.length) {
					strs.push(this.node.data.value || '');
				}

				strs.forEach(str => {

					console.log(str);

          this.node.addStatus({
            message: str,
            timeout: 3000
          });
          
				});

			});

		});

		node.addInput({
			name: "any"
		});

		return node;

	};

	flux.addNode('console log', nodeConstructor);

};
