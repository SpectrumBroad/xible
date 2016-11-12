module.exports = function(FLUX) {

	function constr(NODE) {

		var numberOut = NODE.addOutput('number', {
			type: "math.number"
		});

		numberOut.on('trigger', (conn, state, callback) => {
			callback(+(NODE.data.value || 0));
		});

	}

	FLUX.addNode('math.number', {
		type: "object",
		level: 0,
		groups: ["basics", "math"]
	}, constr);

};
