'use strict';

module.exports = function(FLUX) {

	function constr(NODE) {

		let used = false;
		let refreshing = false;
		let values;

		let valueIn = NODE.addInput('value');

		let refreshIn = NODE.addInput('refresh', {
			type: "trigger"
		});

		let valueOut = NODE.addOutput('value');

		let refreshOut = NODE.addOutput('refresh complete', {
			type: "trigger"
		});

		refreshIn.on('trigger', (state) => {

			//get the input values
			FLUX.Node.getValuesFromInput(valueIn, state).then(vals => {

				//save the state
				state.set(this, {
					values: vals,
					used: true
				});

				FLUX.Node.triggerOutputs(refreshOut, state);

			});

		});

		valueOut.on('trigger', (state, callback) => {
		//valueOut.on('trigger', async (state, callback) => {

			//state handling (if refresh complete was used)
			let thisState = state.get(this);
			if (thisState) {

				if (thisState.used) {
					callback(thisState.values);
				}

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
			/*
			refreshing = true;
			console.log('boe');
			values = await FLUX.Node.getValuesFromInput(valueIn, state);
			used = true;
			refreshing = false;
			console.log('boe');
			callback(values);
			*/
			FLUX.Node.getValuesFromInput(valueIn, state).then((vals) => {

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
