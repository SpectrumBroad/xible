module.exports = function(NODE) {

	let fromIn = NODE.getInputByName('from');
	let toIn = NODE.getInputByName('to');
	let ccIn = NODE.getInputByName('cc');
	let bccIn = NODE.getInputByName('bcc');
	let subjectIn = NODE.getInputByName('subject');
	let textIn = NODE.getInputByName('text');
	let htmlIn = NODE.getInputByName('html');

	let messageOut = NODE.getOutputByName('message');

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

};
