'use strict';

module.exports = function(FLUX) {

	function constr(NODE) {

		let timeout;

		NODE.on('editorContentLoad', function() {

			var inputEl = this.element.getElementsByTagName('input')[0];
			var clock = this.element.querySelector('.face');
			var hour = clock.querySelector('.hour');
			var min = clock.querySelector('.min');
			var sec = clock.querySelector('.sec');

			function setClockFace(value) {

				var d = new Date();

				var input = value.split(':');
				d.setHours(input[0]);

				if (input.length > 1) {
					d.setMinutes(input[1]);
				} else {
					d.setMinutes(0);
				}

				if (input.length > 2) {
					d.setSeconds(input[2]);
				} else {
					d.setSeconds(0);
				}

				let hdeg = d.getHours() * (360 / 12);
				let mdeg = (d.getMinutes() / 60) * 360;
				let sdeg = (d.getSeconds() / 60) * 360;

				hour.style.transform = 'rotate(' + (hdeg + (mdeg / 12)) + 'deg)';
				min.style.transform = 'rotate(' + mdeg + 'deg)';
				sec.style.transform = 'rotate(' + sdeg + 'deg)';

			}

			setClockFace(inputEl.value);
			inputEl.addEventListener('input', () => {setClockFace(inputEl.value);});

		});

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
		groups: ["timing"],
		editorContent: `<input type="time" value="00:00:00" step="1" data-outputvalue="time" />
					<style type="text/css">
					.face {
						margin-left:auto;
						margin-right:auto;
						margin-top:8px;
						width: 40px;
						height:40px;
						border-radius: 50%;
						border:1px solid #000;
						box-shadow:inset 0 0 3px #000;
						background-color:white;
						position: relative;
						box-sizing:border-box;
					}
					.tick, .hand {
						position: absolute;
						top: 3px;
						left: 50%;
						bottom:3px;
						width:1px;
					}
					.tick::before, .hand::before {
						position:absolute;
						content:'';
						display:block;
						width:1px;
						height:1px;
						background-color:#000;
						top:0;
						left:0;
					}
					.hand::before {
						top:auto;
						bottom:50%;
					}
					.tick:nth-child(2) {
						transform:rotate(30deg);
					}
					.tick:nth-child(3) {
						transform:rotate(60deg);
					}
					.tick:nth-child(4) {
						transform:rotate(90deg);
					}
					.tick:nth-child(5) {
						transform:rotate(120deg);
					}
					.tick:nth-child(6) {
						transform:rotate(150deg);
					}
					.tick:nth-child(7) {
						transform:rotate(180deg);
					}
					.tick:nth-child(8) {
						transform:rotate(210deg);
					}
					.tick:nth-child(9) {
						transform:rotate(240deg);
					}
					.tick:nth-child(10) {
						transform:rotate(270deg);
					}
					.tick:nth-child(11) {
						transform:rotate(300deg);
					}
					.tick:nth-child(12) {
						transform:rotate(330deg);
					}
					.hand.hour::before {
						background-color:#000;
						height: 25%;
					}
					.hand.min::before {
						background-color:rgba(0, 0, 0, .7);
						height: 38%;
					}
					.hand.sec::before {
						background-color:rgba(0, 0, 0, .4);
						height: 45%;
					}
				  </style>
					<div class="face">
						<div class="tick"></div>
						<div class="tick"></div>
						<div class="tick"></div>
						<div class="tick"></div>
						<div class="tick"></div>
						<div class="tick"></div>
						<div class="tick"></div>
						<div class="tick"></div>
						<div class="tick"></div>
						<div class="tick"></div>
						<div class="tick"></div>
						<div class="tick"></div>
				    <div class="hand hour"></div>
				    <div class="hand min"></div>
						<div class="hand sec"></div>
				  </div>`
	}, constr);

};
