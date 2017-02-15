module.exports = function(NODE) {

	const Ansible = require('node-ansible');

	if (!NODE.data.remoteUser) {
		NODE.data.remoteUser = process.env.USER;
	}

	NODE
		.getOutputByName('ansible')
		.on('trigger', (conn, state, callback) => {

			let cmd = new Ansible.AdHoc();

			if (NODE.data.remoteUser) {
				cmd.user(NODE.data.remoteUser);
			}

			if (NODE.data.inventoryPath) {
				cmd.inventory(NODE.data.inventoryPath);
			}

			if (NODE.data.connection) {
				cmd.connection(NODE.data.connection);
			}

			callback(cmd);

		});

};
