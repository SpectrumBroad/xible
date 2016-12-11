module.exports = function(FLUX) {

	function constr(NODE) {

		let glowIn = NODE.addInput('glow', {
			type: "glow"
		});

		let nameIn = NODE.addInput('name', {
			type: "string",
			description: "The registered name of the light in Glow. If multiple names are given, multiple lights will be referenced."
		});

		let lightOut = NODE.addOutput('light', {
			type: "glow.light",
			description: "One or more lights to return."
		});

		let powerOut = NODE.addOutput('power', {
			type: "boolean",
			description: "The current power state of the light."
		});

		let colorOut = NODE.addOutput('color', {
			type: "color",
			description: "The current color state of the light."
		});

		function getLightsPerServer(state) {

			//get the glow server
			return NODE.getValuesFromInput(glowIn, state).then((glows) => {

				return Promise.all(glows.map((glow) => {

					if (nameIn.connectors.length) {

						return NODE.getValuesFromInput(nameIn, state)
							.then((names) => Promise.all(names.map((name) => glow.Light.getByName(name))))
							.then((lights) => ({
								server: glow,
								lights: lights
							}));

					} else {

						return glow.Light.getByName(NODE.data.name)
							.then((light) => ({
								server: glow,
								lights: [light]
							}));

					}

				}));

			});

		}

		function getLights(state) {
			return getLightsPerServer(state)
				.then((lightsPerServers) => lightsPerServers.reduce((prev, lightsPerServer) => prev.concat(...lightsPerServer.lights), []));
		}

		let lightStatuses;
		let serverStatuses;
		let lightAllConnectedStatus;

		function lightDisconnected(light) {

			if (lightStatuses[light.name]) {
				return;
			}

			if (lightAllConnectedStatus) {

				NODE.removeStatusById(lightAllConnectedStatus);
				lightAllConnectedStatus = null;

			}

			lightStatuses[light.name] = NODE.addStatus({
				message: `disconnected from: ${light.name}`,
				color: 'red'
			});

		}

		function lightConnected(light) {

			if (lightStatuses[light.name]) {

				NODE.removeStatusById(lightStatuses[light.name]);
				delete lightStatuses[light.name];

			}

			if (!Object.keys(lightStatuses).length && !Object.keys(serverStatuses).length && !lightAllConnectedStatus) {

				lightAllConnectedStatus = NODE.addStatus({
					message: `connected`,
					color: 'green'
				});

			}

		}

		function serverDisconnected(server, lights) {

			if (serverStatuses[server.hostname]) {
				return;
			}

			if (lightAllConnectedStatus) {

				NODE.removeStatusById(lightAllConnectedStatus);
				lightAllConnectedStatus = null;

			}

			serverStatuses[server.hostname] = NODE.addStatus({
				message: `disconnected from server: ${server.hostname}`,
				color: 'red'
			});

			//fake a connected situation for each light so the errors are gone
			lights.forEach((light) => {
				lightConnected(light);
			});

		}

		let serverLightEventsHooked = [];
		let serverEventsHooked = [];

		function serverConnected(server, lights) {

			if (serverStatuses[server.hostname]) {

				NODE.removeStatusById(serverStatuses[server.hostname]);
				delete serverStatuses[server.hostname];

			}

			lights.forEach((light) => {

				if (serverLightEventsHooked.indexOf(server) === -1) {

					light.on('connect', () => lightConnected(light));
					light.on('close', () => lightDisconnected(light));

				}

				if (!light.connected) {
					lightDisconnected(light);
				} else {
					lightConnected(light);
				}

			});

			serverLightEventsHooked.push(server);

		}

		powerOut.on('trigger', (conn, state, callback) => {
			getLights(state).then((lights) => callback(lights.some((light) => light.poweredOn === true)));
		});

		lightOut.on('trigger', (conn, state, callback) => {
			getLights(state).then((lights) => callback(lights));
		});

		//we always init so we can visualise connection status
		//and trigger connected/disconnected events
		let connected = false;
		NODE.on('init', (state) => {

			this.removeAllStatuses();
			lightStatuses = {};
			serverStatuses = {};
			lightAllConnectedStatus = null;

			getLightsPerServer(state).then((lightsPerServers) => {

				lightsPerServers.forEach((lightsPerServer) => {

					let server = lightsPerServer.server;
					let lights = lightsPerServer.lights;

					if (!server || !lights.length) {
						return;
					}

					if (serverEventsHooked.indexOf(server) === -1) {

						server.on('open', () => serverConnected(server, lights));
						server.on('close', () => serverDisconnected(server, lights));

					}
					serverEventsHooked.push(server);

					if (server.readyState === 1) {
						serverConnected(server, lights);
					} else {
						serverDisconnected(server, lights);
					}

				});

			});

		});

	}

	FLUX.addNode('glow.light', {
		type: "object",
		level: 0,
		groups: ["glow"]
	}, constr);

};
