module.exports = function(flux) {

	var nodeConstructor = function() {

		var node = new flux.Node({
			name: "valued if",
			type: "object",
			level: 0,
			groups: ["basics"]
		});

		node.addInput({
			name: "condition",
      type: "boolean"
		});

    node.addInput({
      name: "if true"
    });

    node.addInput({
      name: "if false"
    });

    var valueOut=node.addOutput({
      name: "value"
    });

    valueOut.on('trigger', function(callback) {

      flux.Node.getValuesFromInput(this.node.inputs[0], bools => {

        if(bools.length) {

          var input;
          if(bools.some(bool => !bool)) {
            input=this.node.inputs[2];
          } else {
            input=this.node.inputs[1];
          }
          flux.Node.getValuesFromInput(input, values => callback(values));

        } else {
          callback(null);
        }

      });

    });

    return node;

  };

  flux.addNode('valued if', nodeConstructor);

};


var valueif = {
  name: 'valued if',
  inputs: [{
    name: 'condition',
    type: 'boolean'
  }, {
    name: 'true'
  }, {
    name: 'false'
  }],
  outputs: [{
    name: 'value',
  }]
};
