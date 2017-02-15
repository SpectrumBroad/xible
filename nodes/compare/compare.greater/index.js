module.exports = function(NODE) {

	let aIn = NODE.getInputByName('a');
	let bIn = NODE.getInputByName('b');

	let boolOut = NODE.getOutputByName('result');

	boolOut.on('trigger', (conn, state, callback) => {

		aIn.getValues(state).then((as) => {

			bIn.getValues(state).then((bs) => {

				if (as.length && bs.length) {

					let minA = Math.min.apply(null, as);
					let maxB = Math.max.apply(null, bs);
					callback(minA > maxB);

				} else {
					callback(false);
				}

			});

		});

	});

};
