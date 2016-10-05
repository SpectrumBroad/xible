'use strict';

module.exports = function(FLUX) {

	function constr(NODE) {

		let msecOut = NODE.addOutput('msec', {
			type: "math.number"
		});

		msecOut.on('trigger', (conn, state, callback) => {
			callback(Date.now());
		});

	}

	FLUX.addNode('timing.epoch', {
		type: "object",
		level: 0,
		groups: ["timing"]
	}, constr);

};
