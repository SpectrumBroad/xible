module.exports = function(XIBLE) {

	function constr(NODE) {

		let tempOut = NODE.addOutput('temperature', {
			type: "color.temperature"
		});

		tempOut.on('trigger', (conn, state, callback) => {
			callback(NODE.data.temp);
		});

	}

	XIBLE.addNode('color.temperature', {
		type: "object",
		level: 0,
		groups: ["basics"],
		description: "Returns a color temperature in Kelvin.",
	}, constr);

};
