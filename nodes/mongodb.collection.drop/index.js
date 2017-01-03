module.exports = function(XIBLE) {

	//constructor for the node
	function constr(NODE) {

		let triggerIn = NODE.addInput('trigger', {
			type: 'trigger'
		});

		let collectionIn = NODE.addInput('collection', {
			type: 'mongodb.collection'
		});

		let doneOut = NODE.addOutput('done', {
			type: 'trigger'
		});

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
				.then(() => NODE.triggerOutput(doneOut, state))
				.catch((err) => {

					NODE.addStatus({
						message: '' + err,
						timeout: 5000,
						color: 'red'
					});

				});

		});

	}

	//setup the node definition
	XIBLE.addNode('mongodb.collection.drop', {

		type: "action",
		level: 0,
		description: `Inserts documents into a MongoDb collection`,

	}, constr);

};
