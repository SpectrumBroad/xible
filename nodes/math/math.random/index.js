module.exports = function(NODE) {

	NODE
		.getOutputByName('number')
		.on('trigger', (conn, state, callback) => {
			callback(Math.random());
		});

};
