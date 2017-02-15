module.exports = function(NODE) {

	NODE
		.getOutputByName('number')
		.on('trigger', (conn, state, callback) => {
			callback(+(NODE.data.value || 0));
		});

};
