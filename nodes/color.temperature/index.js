'use strict';

module.exports = function(FLUX) {

	function constr(NODE) {

		let tempOut = NODE.addOutput('temperature', {
			type: "color.temperature"
		});

		tempOut.on('trigger', (conn, state, callback) => {
			callback(NODE.data.temp);
		});

	}

	FLUX.addNode('color.temperature', {
		type: "object",
		level: 0,
		groups: ["basics"],
		description: "Returns a color temperature in Kelvin.",
	}, constr);

};
