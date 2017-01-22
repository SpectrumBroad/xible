module.exports = function(XIBLE) {

	function constr(NODE) {

		let getInputTime = function(node) {

			var input = node.data.time.split(':');

			var d = new Date();
			d.setFullYear(0, 0, 1);
			d.setHours(+input[0]);

			if (input.length > 1) {
				d.setMinutes(+input[1]);
			} else {
				d.setMinutes(0);
			}

			if (input.length > 2) {
				d.setSeconds(+input[2]);
			} else {
				d.setSeconds(0);
			}

			return d;

		};

		let fullDateOut = NODE.addOutput('fulldate', {
			type: "date"
		});

		fullDateOut.on('trigger', (conn, state, callback) => {
			callback(new Date());
		});

		let timeOut = NODE.addOutput('time', {
			type: "time"
		});

		timeOut.on('trigger', (conn, state, callback) => {

			let d = new Date();
			d.setFullYear(0, 0, 1);
			callback(d);

		});

		let yearOut = NODE.addOutput('year', {
			type: "math.number"
		});

		let monthOut = NODE.addOutput('month', {
			type: "math.number"
		});

		let dateOut = NODE.addOutput('date', {
			type: "math.number"
		});

		let hoursOut = NODE.addOutput('hours', {
			type: "math.number"
		});

		let minutesOut = NODE.addOutput('minutes', {
			type: "math.number"
		});

		let secondsOut = NODE.addOutput('seconds', {
			type: "math.number"
		});

		let numberOutTrigger = function(conn, state, callback) {

			let name = this.name;

			if (name === 'year') {
				name = 'fullYear';
			}

			var d = new Date();
			name = name.substring(0, 1).toUpperCase() + this.name.substring(1);
			callback(d['get' + name]());

		};

		yearOut.on('trigger', numberOutTrigger);
		monthOut.on('trigger', numberOutTrigger);
		dateOut.on('trigger', numberOutTrigger);
		hoursOut.on('trigger', numberOutTrigger);
		minutesOut.on('trigger', numberOutTrigger);
		secondsOut.on('trigger', numberOutTrigger);

	}

	XIBLE.addNode('timing.now', {
		type: "object",
		level: 0,
		description: `Returns a time object representing 'now'.`
	}, constr);

};
