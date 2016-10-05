'use strict';


const ws = require('ws');
const EventEmitter = require('events').EventEmitter;


const glowWrapper = require('../../../glowWrapper');


module.exports = function(FLUX) {

	function constr(NODE) {

		let glow;

		//we always init so we can visualise connection status
		//and trigger connected/disconnected events
		let connected = false;
		NODE.on('init', (state) => {

			glow = new glowWrapper({
				hostname: NODE.data.host,
				port: NODE.data.port,
				token: NODE.data.token
			});

			//setup connection
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
			callback(glow);
		});

	}

	FLUX.addNode('glowServer', {
		type: "object",
		level: 0,
		groups: ["glow"],
		editorContent: `<input type="text" placeholder="host" data-outputvalue="host" /><input type="text" placeholder="port" data-outputvalue="port" /><input type="text" placeholder="token" data-outputvalue="token" />`,
	}, constr);

};
