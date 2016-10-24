'use strict';

module.exports = function(FLUX) {

	function constr(NODE) {

		let colorOut = NODE.addOutput('color', {
			type: "color"
		});

		colorOut.on('trigger', (conn, state, callback) => {

			let color = {
				hex: 'ff0000',
				red: 255,
				green: 0,
				blue: 0
			};

			callback(color);

		});

	}

	FLUX.addNode('color', {
		type: "object",
		level: 0,
		groups: ["basics"],
		description: "Returns a color object."
	}, constr);

};
