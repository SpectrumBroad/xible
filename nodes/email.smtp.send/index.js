module.exports = function(FLUX) {

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

			NODE.getValuesFromInput(serverIn, state).then((servers) => {

        NODE.getValuesFromInput(messageIn, state).then((messages) => {

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

          FLUX.Node.triggerOutputs(doneOut, state);

        });

			});

		});

	}

	FLUX.addNode('email.smtp.send', {
		type: "action",
		level: 0,
		groups: ["email"]
	}, constr);

};
