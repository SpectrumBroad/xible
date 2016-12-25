module.exports = function(XIBLE) {

	//constructor for the node
	function constr(NODE) {

		let mongoIn = NODE.addInput('mongodb', {
			type: 'mongodb'
		});

	}

	//setup the node definition
	XIBLE.addNode('mongodb.collection', {

		type: "object",
		level: 0,
		description: `A reference to a MongoDB collection.`,

	}, constr);

};
