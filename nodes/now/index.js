module.exports = function(flux) {

	var constructorFunction = function() {

		var node = new flux.Node({
			name: "now",
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
		});

		node.on('editorContentLoad', function() {

      var date = this.editorContentEl.querySelector('.date');
      var monthNames=['January', 'February', 'March', 'April', 'May', 'June', 'July', 'Augustus', 'September', 'October', 'November', 'December'];

			var clock = this.element.querySelector('.face');
			var hour = clock.querySelector('.hour');
			var min = clock.querySelector('.min');
      var sec = clock.querySelector('.sec');

			window.setInterval(function() {

				var d = new Date();

				hdeg = d.getHours() * (360 / 12);
				mdeg = (d.getMinutes() / 60) * 360;
        sdeg = (d.getSeconds() / 60) * 360;

				hour.style.transform = 'rotate(' + (hdeg+(mdeg/12)) + 'deg)';
				min.style.transform = 'rotate(' + mdeg + 'deg)';
        sec.style.transform = 'rotate(' + sdeg + 'deg)';

        date.innerHTML=d.getDate()+' '+monthNames[d.getMonth()]+' '+d.getFullYear();

			}, 1000);

		});

		var getInputTime = function(node) {

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

    var dateOut = node.addOutput({
      name: "date",
      type: "date"
    });

    dateOut.on('trigger', function(callback) {

      var d = new Date();
      callback(d);

    });

		var timeOut = node.addOutput({
			name: "time",
			type: "time"
		});

		timeOut.on('trigger', function(callback) {

      var d = new Date();
      d.setFullYear(0, 0, 1);
			callback(d);

		});

    var yearOut = node.addOutput({
      name: "year",
      type: "number"
    });

    var monthOut = node.addOutput({
      name: "month",
      type: "number"
    });

    var dateOut = node.addOutput({
      name: "date",
      type: "number"
    });

		var hoursOut = node.addOutput({
			name: "hours",
			type: "number"
		});

		var minutesOut = node.addOutput({
			name: "minutes",
			type: "number"
		});

		var secondsOut = node.addOutput({
			name: "seconds",
			type: "number"
		});

		var numberOutTrigger = function(callback) {

      var name=this.name;

      if(name==='year') {
        name='fullYear';
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

		return node;

	};

	flux.addNode('now', constructorFunction);

};
