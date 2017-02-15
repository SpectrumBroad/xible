module.exports = function(NODE) {

	let mongoIn = NODE.getInputByName('mongodb');

	let collectionOut = NODE.getOutputByName('collection');
	let docsOut = NODE.getOutputByName('documents');

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

};
