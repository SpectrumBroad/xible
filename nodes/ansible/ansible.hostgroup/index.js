module.exports = function(NODE) {

	let varIn = NODE.getInputByName('variables');

	let hostgroupOut = NODE.getOutputByName('hostgroup');
	hostgroupOut.on('trigger', (conn, state, callback) => {

		varIn.getValues(state).then((vars) => {

			callback({
				variables: vars,
				groupName: NODE.data.groupName
			});

		});

	});

};
