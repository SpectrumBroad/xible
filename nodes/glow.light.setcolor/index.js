'use strict';

module.exports = function(FLUX) {

	function hexToRgb(hex) {

		let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : null;

	}

	function rgbToHsv(r, g, b) {

		if (arguments.length === 1) {

			g = r.g;
			b = r.b;
			r = r.r;

		}

		let max = Math.max(r, g, b);
		let min = Math.min(r, g, b);
		let d = max - min;
		let h;
		let s = (max === 0 ? 0 : d / max);
		let v = max / 255;

		switch (max) {
			case min:
				h = 0;
				break;
			case r:
				h = (g - b) + d * (g < b ? 6 : 0);
				h /= 6 * d;
				break;
			case g:
				h = (b - r) + d * 2;
				h /= 6 * d;
				break;
			case b:
				h = (r - g) + d * 4;
				h /= 6 * d;
				break;
		}

		return {
			h: h * 360,
			s: s * 100,
			v: v * 100
		};

	}

	function constr(NODE) {

		let triggerIn = NODE.addInput('trigger', {
			type: "trigger"
		});

		let lightIn = NODE.addInput('light', {
			type: "glow.light"
		});

		let colorIn = NODE.addInput('color', {
			type: "color.hex"
		});

		let doneOut = NODE.addOutput('done', {
			type: "trigger"
		});

		triggerIn.on('trigger', (conn, state) => {

			FLUX.Node.getValuesFromInput(colorIn, state).then((hexColors) => {

				if (!hexColors.length) {

					FLUX.Node.triggerOutputs(doneOut, state);
					return;

				}

				let colors = [];
				hexColors.forEach((hexColor) => {

					let rgb = hexToRgb(hexColor);
					let hsv = rgbToHsv(rgb);

					colors.push(hsv);

				});

				//for now
				let color = colors[0];

				FLUX.Node.getValuesFromInput(lightIn, state).then((lights) => {

					let duration = +NODE.data.duration || 0;
					if (duration) {

						NODE.addProgressBar({
							percentage: 0,
							updateOverTime: duration,
							timeout: duration + 700
						});

					}

					Promise.all(lights.map((light) => light.connected && light.setColor(color.h, color.s, color.v, duration)))
						.then(() => FLUX.Node.triggerOutputs(doneOut, state));

				});

			});

		});

	}

	FLUX.addNode('glow.light.setcolor', {
		type: "action",
		level: 0,
		groups: ["glow"],
		description: "Sets the color on a light registerd in Glow."
	}, constr);

};
