module.exports = function(XIBLE) {

	//constructor for the node
	function constr(NODE) {

		let triggerIn = NODE.addInput('trigger', {
			type: 'trigger'
		});

		let collectionIn = NODE.addInput('collection', {
			type: 'mongodb.collection'
		});

		let documentIn = NODE.addInput('document', {
			type: 'document'
		});

		let doneOut = NODE.addOutput('done', {
			type: 'trigger'
		});

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

				}).then(() => doneOut.trigger( state));

		});

	}

	//setup the node definition
	XIBLE.addNode('mongodb.collection.insert', {

		type: "action",
		level: 0,
		description: `Inserts documents into a MongoDb collection`,

	}, constr);

};
