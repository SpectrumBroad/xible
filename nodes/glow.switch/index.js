module.exports = function(FLUX) {

	function constr(NODE) {

		let glowServerIn = NODE.addInput('glowServer', {
			type: "glowServer"
		});

		let nameIn = NODE.addInput('name', {
			type: "string",
			description: "The registered name of the switch in Glow. If multiple names are given, multiple switches will be referenced."
		});

		let swOut = NODE.addOutput('switch', {
			type: "glow.switch",
			description: "One or more switches to return."
		});

		let switchedOut = NODE.addOutput('switched', {
			type: "boolean",
			description: "The current switch state of the switch."
		});

		function getSwitchesPerServer(state) {

			//get the glow server
			return NODE.getValuesFromInput(glowServerIn, state).then((glowServers) => {

				return Promise.all(glowServers.map((glowServer) => {

					if (nameIn.connectors.length) {

						return NODE.getValuesFromInput(nameIn, state)
							.then((names) => Promise.all(names.map((name) => glowServer.Switch.getByName(name))))
							.then((sws) => ({
								server: glowServer,
								sws: sws
							}));

					} else {

						return glowServer.Switch.getByName(NODE.data.name)
							.then((sw) => ({
								server: glowServer,
								sws: [sw]
							}));

					}

				}));

			});

		}

		function getSwitches(state) {
			return getSwitchesPerServer(state)
				.then((swsPerServers) => swsPerServers.reduce((prev, swsPerServer) => prev.concat(...swsPerServer.sws), []));
		}

		let swStatuses = {};
		let serverStatuses = {};
		let swAllConnectedStatus;

		function swDisconnected(sw) {

			if (swStatuses[sw.name]) {
				return;
			}

			if (swAllConnectedStatus) {

				NODE.removeStatusById(swAllConnectedStatus);
				swAllConnectedStatus = null;

			}

			swStatuses[sw.name] = NODE.addStatus({
				message: `disconnected from: ${sw.name}`,
				color: 'red'
			});

		}

		function swConnected(sw) {

			if (swStatuses[sw.name]) {

				NODE.removeStatusById(swStatuses[sw.name]);
				delete swStatuses[sw.name];

			}

			if (!Object.keys(swStatuses).length && !Object.keys(serverStatuses).length && !swAllConnectedStatus) {

				swAllConnectedStatus = NODE.addStatus({
					message: `connected`,
					color: 'green'
				});

			}

		}

		function serverDisconnected(server, sws) {

			if (serverStatuses[server.hostname]) {
				return;
			}

			if (swAllConnectedStatus) {

				NODE.removeStatusById(swAllConnectedStatus);
				swAllConnectedStatus = null;

			}

			serverStatuses[server.hostname] = NODE.addStatus({
				message: `disconnected from server: ${server.hostname}`,
				color: 'red'
			});

			//fake a connected situation for each sw so the errors are gone
			sws.forEach((sw) => {
				swConnected(sw);
			});

		}

		let serverswEventsHooked = {};
		let serverEventsHooked = {};

		function serverConnected(server, sws) {

			if (serverStatuses[server.hostname]) {

				NODE.removeStatusById(serverStatuses[server.hostname]);
				delete serverStatuses[server.hostname];

			}

			sws.forEach((sw) => {

				if (!serverswEventsHooked[server.hostname]) {

					sw.on('connect', () => swConnected(sw));
					sw.on('close', () => swDisconnected(sw));

				}

				if (!sw.connected) {
					swDisconnected(sw);
				} else {
					swConnected(sw);
				}

			});

			serverswEventsHooked[server.hostname] = true;

		}

		switchedOut.on('trigger', (conn, state, callback) => {
			getSwitches(state).then((sws) => callback(sws.some((sw) => sw.switchedOn === true)));
		});

		swOut.on('trigger', (conn, state, callback) => {
			getSwitches(state).then((sws) => callback(sws));
		});

		//we always init so we can visualise connection status
		//and trigger connected/disconnected events
		let connected = false;
		NODE.on('init', (state) => {

			getSwitchesPerServer(state).then((swsPerServers) => {

				swsPerServers.forEach((swsPerServer) => {

					let server = swsPerServer.server;
					let sws = swsPerServer.sws;

					if (!server || !sws.length) {
						return;
					}

					if (!serverEventsHooked[server.hostname]) {

						server.on('open', () => serverConnected(server, sws));
						server.on('close', () => serverDisconnected(server, sws));

					}
					serverEventsHooked[server.hostname] = true;

					if (server.connected) {
						serverConnected(server, sws);
					} else {
						serverDisconnected(server, sws);
					}

				});

			});

		});

	}

	FLUX.addNode('glow.switch', {
		type: "object",
		level: 0,
		groups: ["glow"]
	}, constr);

};