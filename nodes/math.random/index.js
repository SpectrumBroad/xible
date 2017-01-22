module.exports = function(XIBLE) {

	function constr(NODE) {

		let numberOut = NODE.addOutput('number', {
			type: "math.number"
		});

		numberOut.on('trigger', (conn, state, callback) => {
			callback(Math.random());
		});

	}

	XIBLE.addNode('math.random', {
		type: "object",
		level: 0,
		description: `Returns a pseudo-random floating point number from 0 to 1, but not including 1.`
	}, constr);

};
