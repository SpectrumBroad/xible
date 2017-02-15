module.exports = function(NODE) {

	let msecOut = NODE.getOutputByName('msec');

	msecOut.on('trigger', (conn, state, callback) => {
		callback(Date.now());
	});

};
