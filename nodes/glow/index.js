const EventEmitter = require('events').EventEmitter;
const GlowWrapper = require('../../../glowWrapper');

module.exports = function(XIBLE) {

	function constr(NODE) {

		let glow;

		//we always init so we can visualise connection status
		//and trigger connected/disconnected events
		let connected = false;

		function cont(properConnection, glowExists, state) {

			if (properConnection) {
				return;
			}

			glow.forceConnect().catch((err) => {

				NODE.addStatus({
					message: err.message,
					color: 'red'
				});

			});

			glow.autoReconnect(10000);

			if (!glowExists) {

				glow.on('open', () => {

					NODE.removeAllStatuses();

					NODE.addStatus({
						message: `connected`,
						color: 'green'
					});

					connected = true;

					glowConnected.trigger( state);

				});

				glow.on('error', (err) => {
					NODE.setTracker({
						message: err.message,
						color: 'red',
						timeout: 3000
					});
				});

				glow.on('close', () => {

					NODE.removeAllStatuses();

					NODE.addStatus({
						message: `disconnected`,
						color: 'red'
					});

					if (connected) {
						glowDisconnected.trigger( state);
					}

					connected = false;

				});

			}

		}

		//NODE.on('init', async(state) => {
		NODE.on('init', (state) => {

			//disconnect if already connected
			let glowExists = !!glow;
			let properConnection = glow && glow.readyState === GlowWrapper.STATE_OPEN && glow.hostname === NODE.data.host && glow.port === NODE.data.port && glow.token === NODE.data.token;
			if (glow && !properConnection) {

				//await glow.forceClose();
				glow.forceClose().then(() => {

					glow.hostname = NODE.data.host;
					glow.port = NODE.data.port;
					glow.setToken(NODE.data.token);

					cont(properConnection, glowExists, state);

				});

				return;

			} else if (!glow) {

				//setup connection
				glow = new GlowWrapper({

					hostname: NODE.data.host,
					port: NODE.data.port,
					token: NODE.data.token

				});

				cont(properConnection, glowExists, state);

			}

		});

		let glowConnected = NODE.addOutput('connected', {
			type: "trigger"
		});

		let glowDisconnected = NODE.addOutput('disconnected', {
			type: "trigger"
		});

		let glowOut = NODE.addOutput('glow', {
			type: "glow"
		});

		//return reference glow
		glowOut.on('trigger', (conn, state, callback) => {

			if (!glow) {

				NODE.once('init', () => callback(glow));
				return;

			}

			callback(glow);

		});

	}

	XIBLE.addNode('glow', {
		type: "object",
		level: 0,
		description: `Specifies a Glow server.`,
		vault: [
			'token',
			'host',
			'port'
		]
	}, constr);

};
