module.exports = function(NODE) {

		let triggerIn = NODE.getInputByName('trigger');
		let serverIn = NODE.getInputByName('server');
		let messageIn = NODE.getInputByName('message');

		let doneOut = NODE.getOutputByName('done');

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

          doneOut.trigger( state);

        });

			});

		});

};
