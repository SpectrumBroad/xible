module.exports = function(NODE) {

	let fullDateOut = NODE.getOutputByName('fulldate');

	fullDateOut.on('trigger', (conn, state, callback) => {
		callback(new Date());
	});

	let timeOut = NODE.getOutputByName('time');

	timeOut.on('trigger', (conn, state, callback) => {

		let d = new Date();
		d.setFullYear(0, 0, 1);
		callback(d);

	});

	let yearOut = NODE.getOutputByName('year');
	let monthOut = NODE.getOutputByName('month');
	let dateOut = NODE.getOutputByName('date');
	let hoursOut = NODE.getOutputByName('hours');
	let minutesOut = NODE.getOutputByName('minutes');
	let secondsOut = NODE.getOutputByName('seconds');

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

};
