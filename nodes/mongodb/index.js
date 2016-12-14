const mongoDb = require('mongodb');
const mongoClient = mongoDb.MongoClient;

module.exports = function(XIBLE) {

	//constructor for the node
	function constr(NODE) {

		let db;

		let mongoOut = NODE.addOutput('mongodb', {
			type: 'mongodb'
		});
		mongoOut.on('trigger', (conn, state, callback) => {

			if (!db) {

				this.once('init', () => callback(db));
				return;

			}

			callback(db);

		});

		NODE.on('init', () => {

			mongoClient.connect(`mongodb://${NODE.data.hostname}:${NODE.data.port}/${NODE.data.database}`, function onMongoConnection(err, connDb) {

				if (err) {

					NODE.addStatus({
						message: `disconnected`,
						color: 'red'
					});

					return;

				}

				NODE.addStatus({
					message: `connected`,
					color: 'green'
				});

				db = connDb;

        db.on('error', (err) => {

          NODE.setTracker({
            message: err.toString(),
            color: 'red',
            timeout: 3000
          });

          NODE.removeAllStatuses();
          NODE.addStatus({
            message: `disconnected`,
            color: 'red'
          });

        });

        db.on('close', (err) => {

          if(err) {

            NODE.setTracker({
              message: err.toString(),
              color: 'red',
              timeout: 3000
            });

          }

          NODE.removeAllStatuses();
          NODE.addStatus({
            message: `disconnected`,
            color: 'red'
          });

        });

			});

		});

	}

	//setup the node definition
	XIBLE.addNode('mongodb', {

		type: "object",
		level: 0,
		description: `A reference to a MongoDB database.`,

	}, constr);

};
