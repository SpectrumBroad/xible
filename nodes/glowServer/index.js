const ws = require('ws');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';


module.exports = function(FLUX) {

	function constr(NODE) {

		let socket;

		let glowOut = NODE.addOutput('glowServer', {
			type: "glowServer"
		});

		//return reference to this api
		glowOut.on('trigger', (callback) => {



		});

		//setup the websocket connection
		function connect() {

			if (socket) {
				return;
			}

			socket = new ws(`wss://${NODE.data.host}:${NODE.data.port}/?token=${NODE.data.token}`);

			socket.on('open', () => {

				NODE.removeAllStatuses();

				NODE.addStatus({
					message: `connected`,
					color: 'green'
				});

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

				socket = null;

				//reconnect
				setTimeout(() => {
					connect();
				}, 10000);

			});

		}

		//we always init so we can visualise connection status
		NODE.on('init', () => {
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
