'use strict';

module.exports = function(FLUX) {

	function constr(NODE) {

		let fromIn = NODE.addInput('from', {
			type: "string"
		});

		let toIn = NODE.addInput('to', {
			type: "string"
		});

		let ccIn = NODE.addInput('cc', {
			type: "string"
		});

		let bccIn = NODE.addInput('bcc', {
			type: "string"
		});

		let subjectIn = NODE.addInput('subject', {
			type: "string"
		});

		let textIn = NODE.addInput('text', {
			type: "string"
		});

		let htmlIn = NODE.addInput('html', {
			type: "string"
		});

		let messageOut = NODE.addOutput('message', {
			type: "email.message"
		});

		function addrConnHandler(addrs, type, mail) {
			if (addrs.length) {
				mail[type] = addrs.join(',');
			} else if (NODE.data[type]) {
				mail[type] = NODE.data[type];
			}
		}

		//return reference glow
		messageOut.on('trigger', (conn, state, callback) => {

			let mail = {};

			Promise.all([

				FLUX.Node.getValuesFromInput(fromIn, state).then((addrs) => addrConnHandler(addrs, 'from', mail)),
				FLUX.Node.getValuesFromInput(toIn, state).then((addrs) => addrConnHandler(addrs, 'to', mail)),
				FLUX.Node.getValuesFromInput(ccIn, state).then((addrs) => addrConnHandler(addrs, 'cc', mail)),
				FLUX.Node.getValuesFromInput(bccIn, state).then((addrs) => addrConnHandler(addrs, 'bcc', mail)),

				FLUX.Node.getValuesFromInput(subjectIn, state).then((subjects) => {
					if (subjects.length) {
						mail.subject = subjects[0];
					}
				}),

				FLUX.Node.getValuesFromInput(textIn, state).then((texts) => {
					if (texts.length) {
						mail.text = texts[0];
					}
				}),

				FLUX.Node.getValuesFromInput(htmlIn, state).then((htmls) => {
					if (htmls.length) {
						mail.html = htmls[0];
					}
				})

			]).then(() => {

				if (!mail.from || (!mail.to && !mail.cc && !mail.bcc) || !mail.subject) {
					callback();
				}

				callback(mail);

			});

		});

	}

	FLUX.addNode('email.message', {
		type: "object",
		level: 0,
		groups: ["email"]
	}, constr);

};
