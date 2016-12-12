module.exports = function(FLUX) {

	function constr(NODE) {

		let timeout;

		let triggerIn = NODE.addInput('trigger', {
			type: "trigger"
		});

		triggerIn.on('trigger', (conn, state) => {
			triggerFunction(state);
		});

		let triggerOut = NODE.addOutput('trigger', {
			type: "trigger"
		});

		let boolOut = NODE.addOutput('condition', {
			type: "boolean"
		});

		let timeOut = NODE.addOutput('time', {
			type: "time"
		});

		timeOut.on('trigger', (conn, state, callback) => {
			callback(getInputTime(NODE));
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

		let getInputTime = function() {

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

		};

		let triggerFunction = function(state) {

			var d = getInputTime();

			var now = new Date();
			now.setFullYear(0, 0, 1);

			//calc the difference between the requested time and now
			var diff = d.getTime() - now.getTime();

			//setTimeout trigger on the difference
			//unless it's this second, than trigger immediately
			if (diff >= 0 && diff < 1000) {
				FLUX.Node.triggerOutputs(triggerOut, state);
			} else if (diff > 0) {
				timeout = setTimeout(() => {
					FLUX.Node.triggerOutputs(triggerOut, state);
				}, diff);
			}

		};

		NODE.on('trigger', (state) => {

			//don't auto trigger if we have an input trigger
			if (triggerIn.connectors.length) {
				return;
			}

			triggerFunction(state);

		});

	}

	FLUX.addNode('timing.time', {
		type: "event",
		level: 0,
		description: `Triggered when the given time hits.`
	}, constr);

};
