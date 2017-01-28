module.exports = function(XIBLE) {

	function constr(NODE) {

		let triggerIn = NODE.addInput('trigger', {
			type: "trigger"
		});

		let doneOut = NODE.addOutput('done', {
			type: "trigger"
		});

		let stack = [];
		let statusId;

		triggerIn.on('trigger', (conn, state) => {

			//figure out where this trigger belongs on the stack;
			let thisStack;
			if (!stack.length) {
				stack.push(thisStack = []);
			} else {

				thisStack = stack.find((s) => !s.includes(conn));
				if (!thisStack) {
					stack.push(thisStack = []);
				}

			}

			if (!thisStack.length) {

				thisStack.statusId = NODE.addProgressBar({
					percentage: 1 / triggerIn.connectors.length * 100
				});

			} else {

				NODE.updateProgressBarById(thisStack.statusId, {
					percentage: (thisStack.length + 1) / triggerIn.connectors.length * 100
				});

			}

			thisStack.push(conn);

			if (triggerIn.connectors.length === thisStack.length) {

				stack.shift();
				NODE.removeStatusById(thisStack.statusId, 700);
				doneOut.trigger( state);

			}

		});

	}

	XIBLE.addNode('waitfor', {
		type: "action",
		level: 0,
		description: `Waits for all the input triggers to have triggered, before continuing.`
	}, constr);

};
