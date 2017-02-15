function log(str, NODE) {

	console.log(str);

	NODE.addStatus({
		message: str + '',
		timeout: 3000
	});

}

module.exports = function(NODE) {

	let triggerIn = NODE.getInputByName('trigger');
	let doneOut = NODE.getOutputByName('done');
	triggerIn.on('trigger', (conn, state) => {

		let valueInput = NODE.getInputByName('value');

		if (!valueInput.connectors.length) {

			log(NODE.data.value || '', NODE);
			return doneOut.trigger(state);

		}

		valueInput.getValues(state).then((strs) => {

			strs.forEach(str => {
				log(str, NODE);
			});

			doneOut.trigger(state);

		});

	});

};
