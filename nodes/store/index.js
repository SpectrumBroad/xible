module.exports = function(flux) {

	var constructorFunction = function() {

		var used = false;
    var values;

		var node = new flux.Node({
			name: "store",
			type: "object",
			level: 0,
			groups: ["basics"]
		});

		var anyIn = node.addInput({
			name: "value"
		});

    var refreshIn = node.addInput({
      name: "refresh",
      type: "trigger"
    });

    refreshIn.on('trigger', function() {

      used=true;

      //get the input values
      flux.Node.getValuesFromInput(this.node.inputs[0], vals => {

        values=vals;
        flux.Node.triggerOutputs(this.node.outputs[1]);

      });

    });

		var anyOut = node.addOutput({
			name: "value"
		});

		anyOut.on('trigger', function(callback) {

			if (!used) {

        used=true;

				//get the input values
				flux.Node.getValuesFromInput(this.node.inputs[0], vals => {

          values=vals;
					callback(values);

				});

			} else {
        callback(values);
      }

		});

    var refreshOut = node.addOutput({
      name: "refresh complete",
      type: "trigger"
    });

		return node;

	};

	flux.addNode('store', constructorFunction);

};
