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
/*
			glow.on('message', (ev) => {
				console.log(ev.data);
			});
*/
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


		/*

				let state;
				let glowServer = {};
				Object.setPrototypeOf(glowServer, EventEmitter.prototype);

				let socket;
				let connected = false;

				let glowConnected = NODE.addOutput('connected', {
					type: "trigger"
				});

				let glowDisconnected = NODE.addOutput('disconnected', {
					type: "trigger"
				});

				let glowServerOut = NODE.addOutput('glowServer', {
					type: "glowServer"
				});

				//return reference to this api
				glowServerOut.on('trigger', (conn, state, callback) => {
					callback(glowServer);
				});

				//setup the websocket connection
				function connect() {

					if (socket) {
						return;
					}

					socket = new ws(`wss://${NODE.data.host}:${NODE.data.port}/?token=${NODE.data.token}`);

					socket.on('open', () => {

						connected = true;

						NODE.removeAllStatuses();

						NODE.addStatus({
							message: `connected`,
							color: 'green'
						});

						FLUX.Node.triggerOutputs(glowConnected, state);

					});

					socket.on('message', (data) => {
						console.log(data);
					});

					socket.on('error', (err) => {
						NODE.setTracker({
							message: err.message,
							color: 'red',
							timeout: 3000
						});
					});

					socket.on('close', () => {

						NODE.removeAllStatuses();

						NODE.addStatus({
							message: `disconnected`,
							color: 'red'
						});

						if (connected) {
							FLUX.Node.triggerOutputs(glowDisconnected, state);
						}

						connected = false;
						socket = null;

						//reconnect
						setTimeout(() => connect(), 10000);

					});

				}

				//we always init so we can visualise connection status
				//and trigger connected/disconnected events
				NODE.on('init', (initState) => {
					state = initState;
					connect();
				});
		*/
	}

	FLUX.addNode('glowServer', {
		type: "object",
		level: 0,
		groups: ["glow"],
		editorContent: `<input type="text" placeholder="host" data-outputvalue="host" /><input type="text" placeholder="port" data-outputvalue="port" /><input type="text" placeholder="token" data-outputvalue="token" />`,
	}, constr);

};
