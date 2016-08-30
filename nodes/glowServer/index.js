'use strict';

const ws = require('ws');
const EventEmitter = require('events').EventEmitter;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';


module.exports = function(FLUX) {

	function constr(NODE) {

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
		glowServerOut.on('trigger', (state, callback) => {
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

	}

	FLUX.addNode('glowServer', {
		type: "object",
		level: 0,
		groups: ["glow"],
		editorContent: `<input type="text" placeholder="host" data-outputvalue="host" /><input type="text" placeholder="port" data-outputvalue="port" /><input type="text" placeholder="token" data-outputvalue="token" />`,
	}, constr);

};
