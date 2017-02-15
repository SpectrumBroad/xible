module.exports = function(NODE) {

	let doneOut = NODE.getOutputByName('done');

	let triggerIn = NODE.getInputByName('trigger');
	triggerIn.on('trigger', (conn, state) => {

		conn.origin.node.fail(NODE.data.errorMessage || null, state);
		doneOut.trigger(state);

	});

};
