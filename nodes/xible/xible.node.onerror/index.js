module.exports = function(NODE) {

	NODE.on('init', (state) => {

		NODE.flow.on('error', (error) => {

			let errState = error.state || state;
			errState.set(NODE, {
				error: error
			});

			NODE.getOutputByName('trigger').trigger(errState);

		});

	});

	NODE.getOutputByName('error').on('trigger', (conn, state, callback) => {

		let nodeState = state.get(NODE);
		let error = (nodeState && nodeState.error) || null;

		callback(error);

	});

};
