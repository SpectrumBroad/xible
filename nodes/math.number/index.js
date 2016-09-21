module.exports = function(FLUX) {

	function constr(NODE) {

		var numberOut = NODE.addOutput('number', {
			type: "math.number"
		});

		numberOut.on('trigger', function(state, callback) {
			callback(+(NODE.data.value || 0));
		});

	}

	FLUX.addNode('math.number', {
		type: "object",
		level: 0,
		groups: ["basics", "math"],
		editorContent: '<input type="number" value="0" data-outputvalue="value" />'
	}, constr);

};
