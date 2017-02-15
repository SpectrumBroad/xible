module.exports = function(NODE) {

	NODE.on('trigger', (state) => {
		NODE.getOutputByName('trigger').trigger(state);
	});

};
