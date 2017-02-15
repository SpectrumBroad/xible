module.exports = function(NODE) {

	let glowIn = NODE.getInputByName('glow');
	let groupOut = NODE.getOutputByName('group');
	let devicesOut = NODE.getOutputByName('devices');

	groupOut.on('trigger', (conn, state, callback) => {

		//get the glow server
		glowIn.getValues(state).then((glows) => {

			Promise.all(glows.map((glow) => {
					return glow.Group.getByName(NODE.data.groupName);
				}))
				.then((groups) => {
					callback(groups);
				});

		});

	});

	devicesOut.on('trigger', (conn, state, callback) => {

		//get the glow server
		glowIn.getValues(state).then((glows) => {

			callback(glows.map((glow) => {
				return glow.Group.getByName(NODE.data.value).getDevices();
			}));

		});

	});

};
