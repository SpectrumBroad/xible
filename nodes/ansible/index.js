const Ansible = require('node-ansible');

module.exports = function(FLUX) {

	function constr(NODE) {

		if (!NODE.data.remoteUser) {
			NODE.data.remoteUser = process.env.USER;
		}

		let ansibleOut = NODE.addOutput('ansible', {
			type: "ansible"
		});

		ansibleOut.on('trigger', (conn, state, callback) => {
			callback(new Ansible.AdHoc().user(NODE.data.remoteUser).inventory(NODE.data.inventoryPath));
		});

	}

	FLUX.addNode('ansible', {
		type: "object",
		level: 0,
		description: 'Reference to a Ansible instance.'
	}, constr);

};
