const EventEmitter = require('events').EventEmitter;
const GlowWrapper = require('../../../GlowWrapper');


module.exports = function(XIBLE) {

	function constr(NODE) {

		let glow;

		//we always init so we can visualise connection status
		//and trigger connected/disconnected events
		let connected = false;
		NODE.on('init', async(state) => {

			//disconnect if already connected
			let glowExists = !!glow;
			let properConnection = glow && glow.readyState === GlowWrapper.STATE_OPEN && glow.hostname === NODE.data.host && glow.port === NODE.data.port && glow.token === NODE.data.token;
			if (glow && !properConnection) {

				await glow.forceClose();

				glow.hostname = NODE.data.host;
				glow.port = NODE.data.port;
				glow.setToken(NODE.data.token);

			} else if (!glow) {

				//setup connection
				glow = new GlowWrapper({

					hostname: NODE.data.host,
					port: NODE.data.port,
					token: NODE.data.token

				});

			}

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

					XIBLE.Node.triggerOutput(glowConnected, state);

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
						XIBLE.Node.triggerOutput(glowDisconnected, state);
					}

					connected = false;

				});

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
		description: `Specifies a Glow server.`
	}, constr);

};
