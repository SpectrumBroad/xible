module.exports = function(NODE) {

	let doneOut = NODE.getOutputByName('done');

	let triggerIn = NODE.getInputByName('trigger');
	triggerIn.on('trigger', (conn, state) => {

		conn.origin.node.error(NODE.data.errorMessage || null, state);
		doneOut.trigger(state);

	});

};
