module.exports = function(XIBLE) {

	function constr(NODE) {

		let glowIn = NODE.addInput('glow', {
			type: "glow"
		});

		let groupOut = NODE.addOutput('group', {
			type: "glow.group"
		});

		let devicesOut = NODE.addOutput('devices', {
			type: "document"
		});

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

	}

	XIBLE.addNode('glow.group', {
		type: "object",
		level: 0,
		description: "References a Glow group."
	}, constr);

};
