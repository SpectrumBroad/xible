module.exports = function(XIBLE) {

	function constr(NODE) {

		let serverIn = NODE.addInput('server', {
			type: "http.server"
		});

		let triggerOut = NODE.addOutput('trigger', {
			type: "trigger"
		});

		let reqOut = NODE.addOutput('request', {
			type: "http.request"
		});

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

							triggerOut.trigger( state);

						});

						return;

					}

					server[method](NODE.data.path, (req, res) => {

						state.set(NODE, {
							req: req
						});

						triggerOut.trigger( state);

					});

				});

			});

		});

	}

	XIBLE.addNode('https.server.onrequest', {
		type: "event",
		level: 0,
		description: `Triggered whenever a HTTPS request lands on the given route.`
	}, constr);

};
