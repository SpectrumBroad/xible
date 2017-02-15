module.exports = function(NODE) {

	let tempOut = NODE.getOutputByName('temperature');

	tempOut.on('trigger', (conn, state, callback) => {
		callback(NODE.data.temp);
	});

};
