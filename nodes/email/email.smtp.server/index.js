module.exports = function(NODE) {

	const nodemailer = require('nodemailer');

	let serverOut = NODE.getOutputByName('server');
	serverOut.on('trigger', (conn, state, callback) => {

		let smtpConfig = {
			host: NODE.data.host,
			port: NODE.data.port,
			secure: false, //use SSL/TLS
			//proxy: 'http://someaddress:someport/'
			auth: {
				user: NODE.data.username,
				pass: NODE.data.password
			}
		};

		callback(nodemailer.createTransport(smtpConfig));

	});

};
