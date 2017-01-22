module.exports = function(XIBLE) {

	function constr(NODE) {

		var numberOut = NODE.addOutput('number', {
			type: "math.number"
		});

		numberOut.on('trigger', (conn, state, callback) => {
			callback(+(NODE.data.value || 0));
		});

	}

	XIBLE.addNode('math.number', {
		type: "object",
		level: 0,
		description: `Defines a number.`
	}, constr);

};
