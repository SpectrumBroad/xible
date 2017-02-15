module.exports = function(NODE) {

	let triggerIn = NODE.getInputByName('trigger');
	let collectionIn = NODE.getInputByName('collection');
	let documentIn = NODE.getInputByName('document');

	let doneOut = NODE.getOutputByName('done');

	triggerIn.on('trigger', (conn, state) => {

		if (!collectionIn.isConnected() || !documentIn.isConnected()) {
			return;
		}

		Promise.all([collectionIn.getValues(state), documentIn.getValues(state)])
			.then(([collections, documents]) => {

				//loop the collections and insert
				return Promise.all(collections.map((collection) => {
					return collection.insertMany(documents);
				}));

			}).then(() => doneOut.trigger(state));

	});

};
