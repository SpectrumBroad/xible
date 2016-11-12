'use strict';


const ws = require('ws');
const EventEmitter = require('events').EventEmitter;


const GlowWrapper = require('../../../GlowWrapper');


module.exports = function(FLUX) {

	function constr(NODE) {

		let glow;

		//we always init so we can visualise connection status
		//and trigger connected/disconnected events
		let connected = false;
		NODE.on('init', (state) => {

			//disconnect if already connected
			let properConnection = glow && glow.connected && glow.hostname === NODE.data.host && glow.port === NODE.data.port && glow.token === NODE.data.token;
			if (glow && glow.connected && !properConnection) {
				glow.close();
			}

			//if we already have a working connection, keep it open
			if (properConnection) {
				return;
			}

			//setup connection
			glow = new GlowWrapper({

				hostname: NODE.data.host,
				port: NODE.data.port,
				token: NODE.data.token

			});

			glow.connect().catch((err) => {

				NODE.addStatus({
					message: err.message,
					color: 'red'
				});

			});

			glow.autoReconnect(10000);

			glow.on('open', () => {

				NODE.removeAllStatuses();

				NODE.addStatus({
					message: `connected`,
					color: 'green'
				});

				connected = true;

				FLUX.Node.triggerOutputs(glowConnected, state);

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
					FLUX.Node.triggerOutputs(glowDisconnected, state);
				}

				connected = false;

			});

		});

		let glowConnected = NODE.addOutput('connected', {
			type: "trigger"
		});

		let glowDisconnected = NODE.addOutput('disconnected', {
			type: "trigger"
		});

		let glowServerOut = NODE.addOutput('glowServer', {
			type: "glowServer"
		});

		//return reference glow
		glowServerOut.on('trigger', (conn, state, callback) => {

			if(!glow) {

				this.once('init', () => callback(glow));
				return;

			}

			callback(glow);

		});

	}

	FLUX.addNode('glowServer', {
		type: "object",
		level: 0,
		groups: ["glow"]
	}, constr);

};
