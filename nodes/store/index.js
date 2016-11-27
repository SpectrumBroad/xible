'use strict';

module.exports = function(FLUX) {

	function constr(NODE) {

		let used = false;
		let refreshing = false;
		let values;

		let refreshIn = NODE.addInput('refresh', {
			type: "trigger"
		});

		let valueIn = NODE.addInput('value');

		let refreshOut = NODE.addOutput('refreshed', {
			type: "trigger"
		});

		let valueOut = NODE.addOutput('value');

		refreshIn.on('trigger', (conn, state) => {

			//get the input values
			refreshing = true;
			NODE.getValuesFromInput(valueIn, state).then(vals => {

				//
				used = true;
				refreshing = false;
				values = vals;

				//save the state
				state.set(this, {
					values: vals
				});

				FLUX.Node.triggerOutputs(refreshOut, state);

			});

		});

		valueOut.on('trigger', (conn, state, callback) => {

			//state handling (if refresh complete was used)
			let thisState = state.get(this);
			if (thisState) {

				callback(thisState.values);
				return;

			}

			//callback immeditialy if we already have this value(s) in store
			if (used) {

				callback(values);
				return;

			}

			//wait to callback when we're currently refreshing the value(s)
			if (refreshing) {

				valueOut.once('triggerdone', () => {
					callback(values);
				});

				return;

			}

			//perform a refresh of all inputs and return those values
			refreshing = true;
			NODE.getValuesFromInput(valueIn, state).then((vals) => {

				values = vals;
				used = true;
				refreshing = false;
				callback(values);

			});

		});

	}

	FLUX.addNode('store', {
		type: "object",
		level: 0,
		groups: ["basics"]
	}, constr);

};
