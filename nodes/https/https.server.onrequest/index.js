module.exports = function(NODE) {

	let serverIn = NODE.getInputByName('server');

	let triggerOut = NODE.getOutputByName('trigger');
	let reqOut = NODE.getOutputByName('request');

	reqOut.on('trigger', (conn, state, callback) => {

		let req = null;
		let nodeState = state.get(NODE);

		if (nodeState && nodeState.req) {
			req = nodeState.req;
		}

		callback(req);

	});

	NODE.on('init', (state) => {

		let method = NODE.data.method || 'get';
		method = method.toLowerCase();

		serverIn.getValues(state).then((servers) => {

			servers.forEach((server) => {

				if (!NODE.data.path) {

					server[method]((req, res) => {

						state.set(NODE, {
							req: req
						});

						triggerOut.trigger(state);

					});

					return;

				}

				server[method](NODE.data.path, (req, res) => {

					state.set(NODE, {
						req: req
					});

					triggerOut.trigger(state);

				});

			});

		});

	});

};
