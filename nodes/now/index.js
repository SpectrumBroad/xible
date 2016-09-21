'use strict';

module.exports = function(FLUX) {

	function constr(NODE) {

		NODE.on('editorContentLoad', function() {

			let date = this.editorContentEl.querySelector('.date');
			let monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'Augustus', 'September', 'October', 'November', 'December'];

			let clock = this.element.querySelector('.face');
			let hour = clock.querySelector('.hour');
			let min = clock.querySelector('.min');
			let sec = clock.querySelector('.sec');

			function setClockFace() {

				let d = new Date();

				let hdeg = d.getHours() * (360 / 12);
				let mdeg = (d.getMinutes() / 60) * 360;
				let sdeg = (d.getSeconds() / 60) * 360;

				hour.style.transform = 'rotate(' + (hdeg + (mdeg / 12)) + 'deg)';
				min.style.transform = 'rotate(' + mdeg + 'deg)';
				sec.style.transform = 'rotate(' + sdeg + 'deg)';

				date.innerHTML = d.getDate() + ' ' + monthNames[d.getMonth()] + ' ' + d.getFullYear();

			}

			setClockFace();
			setInterval(setClockFace, 1000);

		});

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

		fullDateOut.on('trigger', (state, callback) => {
			callback(new Date());
		});

		let timeOut = NODE.addOutput('time', {
			type: "time"
		});

		timeOut.on('trigger', (state, callback) => {

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

		let numberOutTrigger = function(state, callback) {

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

	FLUX.addNode('now', {
			type: "object",
			level: 0,
			groups: ["datetime"],
			editorContent: `<div class="date"></div>
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
		},
		constr);

};
