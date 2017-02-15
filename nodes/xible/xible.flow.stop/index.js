module.exports = function(NODE) {

	let triggerIn = NODE.getInputByName('trigger');

	triggerIn.on('trigger', (conn, state) => {

		process.send({
			method: "stop"
		});

	});

};
