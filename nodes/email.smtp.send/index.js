module.exports = function(XIBLE) {

	function constr(NODE) {

		let triggerIn = NODE.addInput('trigger', {
			type: "trigger"
		});

		let serverIn = NODE.addInput('server', {
			type: "email.smtp.server"
		});

		let messageIn = NODE.addInput('message', {
			type: "email.message"
		});

		let doneOut = NODE.addOutput('done', {
			type: "trigger"
		});

		//return reference glow
		triggerIn.on('trigger', (conn, state) => {

			serverIn.getValues(state).then((servers) => {

        messageIn.getValues(state).then((messages) => {

          servers.forEach((server) => {

            messages.forEach((message) => {

              if (!message.from || (!message.to && !message.cc && !message.bcc) || !message.subject) {
                return;
              }

              server.sendMail(message, (err) => {

                if (err) {

                  NODE.addStatus({
                    message: err,
                    color: 'red'
                  });

                }

              });

            });

          });

          NODE.triggerOutput(doneOut, state);

        });

			});

		});

	}

	XIBLE.addNode('email.smtp.send', {
		type: "action",
		level: 0,
		description: `Sends an email messages to a given smtp server.`
	}, constr);

};
