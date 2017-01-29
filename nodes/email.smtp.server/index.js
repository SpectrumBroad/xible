let nodemailer = require('nodemailer');

module.exports = function(XIBLE) {

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

	XIBLE.addNode('email.smtp.server', {
		type: "object",
		level: 0,
		description: `Defines an email SMTP server.`,
		vault: [
			'host',
			'port',
			'username',
			'password'
		]
	}, constr);

};
