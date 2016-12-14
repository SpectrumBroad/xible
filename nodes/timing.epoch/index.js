module.exports = function(XIBLE) {

	function constr(NODE) {

		let msecOut = NODE.addOutput('msec', {
			type: "math.number"
		});

		msecOut.on('trigger', (conn, state, callback) => {
			callback(Date.now());
		});

	}

	XIBLE.addNode('timing.epoch', {
		type: "object",
		level: 0,
		description: `Returns the amount of milliseconds since Unix epoch. That is, 1 January 1970 00:00:00 UTC.`
	}, constr);

};
