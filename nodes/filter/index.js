module.exports = function(XIBLE) {

	function constr(NODE) {

		let anyIn = NODE.addInput('any');

		let boolIn = NODE.addInput('condition', {
			type: 'boolean'
		});

		let filteredOut = NODE.addOutput('filtered');
		filteredOut.on('trigger', (conn, state, callback) => {

			anyIn.getValues(state).then((values) => {

				boolIn.getValues(state).then((conditions) => {

					if (conditions.indexOf(false) === -1) {
						callback(values);
					}

				});

			});

		});

		let droppedOut = NODE.addOutput('dropped');
    droppedOut.on('trigger', (conn, state, callback) => {

      anyIn.getValues(state).then((values) => {

        boolIn.getValues(state).then((conditions) => {

          if (conditions.indexOf(true) === -1) {
            callback(values);
          }

        });

      });

    });

	}

	XIBLE.addNode('filter', {
		type: "object",
		level: 0,
		description: `Filters data based on an input condition.`
	}, constr);

};
