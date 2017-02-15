module.exports = function(NODE) {

	let glowIn = NODE.getInputByName('glow');
	let nameIn = NODE.getInputByName('name');

	let lightOut = NODE.getOutputByName('light');
	let powerOut = NODE.getOutputByName('power');
	let colorOut = NODE.getOutputByName('color');

	function getLightsPerServer(state) {

		//get the glow server
		return glowIn.getValues(state).then((glows) => {

			return Promise.all(glows.map((glow) => {

				if (nameIn.isConnected()) {

					return nameIn.getValues(state)
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

		if (serverLightEventsHooked.indexOf(server) === -1) {
			serverLightEventsHooked.push(server);
		}

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

					serverEventsHooked.push(server);

				}

				if (server.readyState === 1) {
					serverConnected(server, lights);
				} else {
					serverDisconnected(server, lights);
				}

			});

		});

	});

};
