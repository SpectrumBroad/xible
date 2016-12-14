const Ansible = require('node-ansible');

module.exports = function(XIBLE) {

	function constr(NODE) {

		if (!NODE.data.remoteUser) {
			NODE.data.remoteUser = process.env.USER;
		}

		let ansibleOut = NODE.addOutput('ansible', {
			type: "ansible"
		});

		ansibleOut.on('trigger', (conn, state, callback) => {

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

	}

	XIBLE.addNode('ansible', {
		type: "object",
		level: 0,
		description: 'Reference to a Ansible instance.'
	}, constr);

};
