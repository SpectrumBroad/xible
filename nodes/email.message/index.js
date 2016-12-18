module.exports = function(XIBLE) {

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

				fromIn.getValues(state).then((addrs) => addrConnHandler(addrs, 'from', mail)),
				toIn.getValues(state).then((addrs) => addrConnHandler(addrs, 'to', mail)),
				ccIn.getValues(state).then((addrs) => addrConnHandler(addrs, 'cc', mail)),
				bccIn.getValues(state).then((addrs) => addrConnHandler(addrs, 'bcc', mail)),

				subjectIn.getValues(state).then((subjects) => {
					if (subjects.length) {
						mail.subject = subjects[0];
					}
				}),

				textIn.getValues(state).then((texts) => {
					if (texts.length) {
						mail.text = texts[0];
					}
				}),

				htmlIn.getValues(state).then((htmls) => {
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

	XIBLE.addNode('email.message', {
		type: "object",
		level: 0,
		description: `Defines an email message.`
	}, constr);

};
