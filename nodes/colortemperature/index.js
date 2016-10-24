'use strict';

module.exports = function(FLUX) {

	function constr(NODE) {

		let tempOut = NODE.addOutput('temp', {
			type: "colortemperature"
		});

		tempOut.on('trigger', (conn, state, callback) => {
			callback(NODE.data.temp);
		});

	}

	FLUX.addNode('colortemperature', {
		type: "object",
		level: 0,
		groups: ["basics"],
		description: "Returns a color temperature in Kelvin.",
	}, constr);

};
