module.exports = function(flux) {

	var nodeConstructor = function() {

		var node = new flux.Node({
			name: "equals",
			type: "object",
			level: 0,
			groups: ["basics"]
		});

		node.addInput({
			name: "values"
		});

		var boolOut = node.addOutput({
			name: "result",
			type: "boolean"
		});

    boolOut.on('trigger', function(callback) {

      flux.Node.getValuesFromInput(this.node.inputs[0], vals => {

        if (vals.length) {

          var firstVal=vals[0];
          callback(vals.every(val => val === firstVal));

        } else {
          callback(false);
        }

      });

    });

		return node;

	};

	flux.addNode('equals', nodeConstructor);

};
