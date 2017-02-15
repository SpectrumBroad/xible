module.exports = function(NODE) {

	let timeout;

	let triggerIn = NODE.getInputByName('trigger');
	triggerIn.on('trigger', (conn, state) => {
		triggerFunction(state);
	});

	let triggerOut = NODE.getOutputByName('trigger');
	let boolOut = NODE.getOutputByName('condition');

	let timeOut = NODE.getOutputByName('time');
	timeOut.on('trigger', (conn, state, callback) => {
		callback(getInputTime(NODE));
	});

	let hoursOut = NODE.getOutputByName('hours');
	let minutesOut = NODE.getOutputByName('minutes');
	let secondsOut = NODE.getOutputByName('seconds');

	let numberOutTrigger = (state, callback) => {

		var d = getInputTime(this.node);
		var name = this.name.substring(0, 1).toUpperCase() + this.name.substring(1);
		callback(d['get' + name]());

	};

	hoursOut.on('trigger', numberOutTrigger);
	minutesOut.on('trigger', numberOutTrigger);
	secondsOut.on('trigger', numberOutTrigger);

	NODE.on('close', function() {

		if (timeout) {

			clearTimeout(timeout);
			timeout = null;

		}

	});

	function getInputTime() {

		let input = NODE.data.time.split(':');

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

	}

	function triggerFunction(state) {

		var d = getInputTime();

		var now = new Date();
		now.setFullYear(0, 0, 1);

		//calc the difference between the requested time and now
		var diff = d.getTime() - now.getTime();

		//setTimeout trigger on the difference
		//unless it's this second, than trigger immediately
		if (diff >= 0 && diff < 1000) {
			triggerOut.trigger(state);
		} else if (diff > 0) {
			timeout = setTimeout(() => {
				triggerOut.trigger(state);
			}, diff);
		}

	}

	NODE.on('trigger', (state) => {

		//don't auto trigger if we have an input trigger
		if (triggerIn.isConnected()) {
			return;
		}

		triggerFunction(state);

	});

};
