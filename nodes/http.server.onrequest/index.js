module.exports = function(FLUX) {

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

			let type = NODE.data.type.toLowerCase() || 'use';

			NODE.getValuesFromInput(serverIn, state).then((servers) => {

				servers.forEach((server) => {

					if (!NODE.data.path) {

						server[type]((req, res) => {

							state.set(NODE, {
								req: req
							});

							FLUX.Node.triggerOutputs(triggerOut, state);

						});

						return;

					}

					server[type](NODE.data.path, (req, res) => {

						state.set(NODE, {
							req: req
						});

						FLUX.Node.triggerOutputs(triggerOut, state);

					});

				});

			});

		});

	}

	FLUX.addNode('http.server.onrequest', {
		type: "event",
		level: 0,
		description: `Triggered whenever a HTTP request lands on the given route.`
	}, constr);

};
