module.exports = function(flux) {

	var nodeConstructor = function() {

		var node = new flux.Node({
			name: "trigger if",
			type: "action",
			level: 0,
			groups: ["basics"]
		});

		var triggerIn = node.addInput({
			name: "trigger",
      type: "trigger"
		});

    triggerIn.on('trigger', function() {

      flux.Node.getValuesFromInput(this.node.inputs[1], bools => {

        if(bools.length) {

          if(bools.some(bool => !bool)) {
            flux.Node.triggerOutputs(this.node.outputs[1]);
          } else {
            flux.Node.triggerOutputs(this.node.outputs[0]);
          }

        } else {
          flux.Node.triggerOutputs(this.node.outputs[1]);
        }

      });

    });

    node.addInput({
			name: "condition",
      type: "boolean"
		});

    node.addOutput({
      name: "then",
      type: "trigger"
    });

    node.addOutput({
      name: "else",
      type: "trigger"
    });

    return node;

  };

  flux.addNode('trigger if', nodeConstructor);

};
