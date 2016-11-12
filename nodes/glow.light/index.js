module.exports = function(FLUX) {

	function constr(NODE) {

		let glowServerIn = NODE.addInput('glowServer', {
			type: "glowServer"
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
			return FLUX.Node.getValuesFromInput(glowServerIn, state).then((glowServers) => {

				return Promise.all(glowServers.map((glowServer) => {

					if (nameIn.connectors.length) {

						return FLUX.Node.getValuesFromInput(nameIn, state)
							.then((names) => Promise.all(names.map((name) => glowServer.Light.getByName(name))))
							.then((lights) => ({
								server: glowServer,
								lights: lights
							}));

					} else {

						return glowServer.Light.getByName(NODE.data.name)
							.then((light) => ({
								server: glowServer,
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

		let lightStatuses = {};
		let serverStatuses = {};
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

		let serverLightEventsHooked = {};
		let serverEventsHooked = {};

		function serverConnected(server, lights) {

			if (serverStatuses[server.hostname]) {

				NODE.removeStatusById(serverStatuses[server.hostname]);
				delete serverStatuses[server.hostname];

			}

			lights.forEach((light) => {

				if (!serverLightEventsHooked[server.hostname]) {

					light.on('connect', () => lightConnected(light));
					light.on('close', () => lightDisconnected(light));
					
				}

				if (!light.connected) {
					lightDisconnected(light);
				} else {
					lightConnected(light);
				}

			});

			serverLightEventsHooked[server.hostname] = true;

		}

		powerOut.on('trigger', (conn, state, callback) => {
			getLights(state).then((lights) => callback(lights.some((light) => light.power === true)));
		});

		lightOut.on('trigger', (conn, state, callback) => {
			getLights(state).then((lights) => callback(lights));
		});

		//we always init so we can visualise connection status
		//and trigger connected/disconnected events
		let connected = false;
		NODE.on('init', (state) => {

			getLightsPerServer(state).then((lightsPerServers) => {

				lightsPerServers.forEach((lightsPerServer) => {

					let server = lightsPerServer.server;
					let lights = lightsPerServer.lights;

					if (!server || !lights.length) {
						return;
					}

					if (!serverEventsHooked[server.hostname]) {

						server.on('open', () => serverConnected(server, lights));
						server.on('close', () => serverDisconnected(server, lights));

					}
					serverEventsHooked[server.hostname] = true;

					if (server.connected) {
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
