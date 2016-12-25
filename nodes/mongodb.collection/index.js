module.exports = function(XIBLE) {

	//constructor for the node
	function constr(NODE) {

		let mongoIn = NODE.addInput('mongodb', {
			type: 'mongodb'
		});

		let collectionOut = NODE.addOutput('collection', {
			type: 'mongodb.collection'
		});

		let docsOut = NODE.addOutput('documents', {
			type: 'document'
		});

		collectionOut.on('trigger', (conn, state, callback) => {

			if (!mongoIn.isConnected()) {
				return;
			}

			mongoIn.getValues(state).then((mongos) => {
				callback(mongos.map((mongo) => mongo.collection(NODE.data.collectionName)));
			});

		});

		docsOut.on('trigger', (conn, state, callback) => {

			if (!mongoIn.isConnected()) {
				return;
			}

			mongoIn.getValues(state).then((mongos) => {

				Promise.all(mongos.map((mongo) => {
					return mongo.collection(NODE.data.collectionName).find().toArray();
				})).then((arrs) => {
					callback([].concat(...arrs));
				});
				
			});

		});

	}

	//setup the node definition
	XIBLE.addNode('mongodb.collection', {

		type: "object",
		level: 0,
		description: `A reference to a MongoDB collection.`,

	}, constr);

};
