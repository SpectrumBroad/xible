module.exports = function(FLUX) {

	function constr(NODE) {

		let anyIn = NODE.addInput('any');

		let boolIn = NODE.addInput('condition', {
			type: 'boolean'
		});

		let filteredOut = NODE.addOutput('filtered');
		filteredOut.on('trigger', (conn, state, callback) => {

			NODE.getValuesFromInput(anyIn, state).then((values) => {

				NODE.getValuesFromInput(boolIn, state).then((conditions) => {

					if (conditions.indexOf(false) === -1) {
						callback(values);
					}

				});

			});

		});

		let droppedOut = NODE.addOutput('dropped');
    droppedOut.on('trigger', (conn, state, callback) => {

      NODE.getValuesFromInput(anyIn, state).then((values) => {

        NODE.getValuesFromInput(boolIn, state).then((conditions) => {

          if (conditions.indexOf(true) === -1) {
            callback(values);
          }

        });

      });

    });

	}

	FLUX.addNode('filter', {
		type: "object",
		level: 0,
		groups: ["basics"]
	}, constr);

};
