'use strict';

module.exports = function(FLUX) {

	function constr(NODE) {

		let numberOut = NODE.addOutput('number', {
			type: "math.number"
		});

		numberOut.on('trigger', (conn, state, callback) => {
			callback(Math.random());
		});

	}

	FLUX.addNode('math.random', {
		type: "object",
		level: 0,
		groups: ["math"]
	}, constr);

};
