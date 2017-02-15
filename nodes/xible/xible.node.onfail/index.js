module.exports = function(NODE) {

	NODE.on('init', () => {

		NODE.flow.on('fail', (node, error, state) => {

			state.set(NODE, {
				error: error
			});

			NODE.getOutputByName('trigger').trigger(state);

		});

	});

	NODE.getOutputByName('error').on('trigger', (conn, state, callback) => {

		let nodeState = state.get(NODE);
		let error = (nodeState && nodeState.error) || null;

		callback(error);

	});

};
