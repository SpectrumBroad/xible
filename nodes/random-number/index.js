'use strict';

module.exports = function(FLUX) {

	function constr(NODE) {

		let numberOut = NODE.addOutput('number', {
			type: "number"
		});

		numberOut.on('trigger', (state, callback) => {
			callback(Math.random());
		});

	}

	FLUX.addNode('random number', {
		type: "object",
		level: 0,
		groups: ["math"]
	}, constr);

};
