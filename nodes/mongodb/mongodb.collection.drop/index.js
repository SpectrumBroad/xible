module.exports = function(NODE) {

	let triggerIn = NODE.getInputByName('trigger');
	let collectionIn = NODE.getInputByName('collection');

	let doneOut = NODE.getOutputByName('done');

	triggerIn.on('trigger', (conn, state) => {

		if (!collectionIn.isConnected()) {
			return;
		}

		collectionIn.getValues(state)
			.then((collections) => {

				//loop the collections and insert
				return Promise.all(collections.map((collection) => {
					return collection.drop();
				}));

			})
			.then(() => doneOut.trigger(state))
			.catch((err) => {

				NODE.addStatus({
					message: '' + err,
					timeout: 5000,
					color: 'red'
				});

			});

	});

};
