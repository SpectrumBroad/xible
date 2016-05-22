module.exports = function(flux) {

	var constructorFunction = function() {

		var node = new flux.Node({
			name: "group",
			type: "object",
			level: 0,
			groups: ["basics"]
		});

		var anyIn=node.addInput({
			name: "any"
		});

    anyIn.on('editorAttach', function(connector) {

      var type = connector.origin.type;
      this.setType(type).setName(type);
      this.node.outputs[0].setType(type).setName(type);

    });

    anyIn.on('editorDetach', function(connector) {

      if (!this.connectors.length) {

        this.setType(null).setName('any');
        this.node.outputs[0].setType(null).setName('any');

      }

    });

		var groupedOut = node.addOutput({
			name: "grouped"
		});

		groupedOut.on('trigger', function(callback) {

			flux.Node.getValuesFromInput(this.node.inputs[0], vals => {
				callback(vals);
			});

		});

		return node;

	};

	flux.addNode('group', constructorFunction);

};
