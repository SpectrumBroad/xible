'use strict';

let nodemailer = require('nodemailer');

module.exports = function(FLUX) {

	function constr(NODE) {

		let serverOut = NODE.addOutput('server', {
			type: "email.smtp.server"
		});

		//return reference glow
		serverOut.on('trigger', (conn, state, callback) => {

			let smtpConfig = {
				host: NODE.data.host,
				port: NODE.data.port,
				secure: false,  //use SSL/TLS
        //proxy: 'http://someaddress:someport/'
				auth: {
					user: NODE.data.username,
					pass: NODE.data.password
				}
			};

			callback(nodemailer.createTransport(smtpConfig));

		});

	}

	FLUX.addNode('email.smtp.server', {
		type: "action",
		level: 0,
		groups: ["basics"]
	}, constr);

};
