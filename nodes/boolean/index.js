module.exports = function(NODE) {

	let stringOut = NODE.getOutputByName('result');
	stringOut.on('trigger', (conn, state, callback) => {
		callback(NODE.data.value === 'true');
	});

};
