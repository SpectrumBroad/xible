//from http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
function rgbToHex(r, g, b) {
	return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

//from http://stackoverflow.com/questions/17242144/javascript-convert-hsb-hsv-color-to-rgb-accurately
function hsvToRgb(h, s, v) {
	let r, g, b, i, f, p, q, t;
	if (arguments.length === 1) {
		s = h.s;
		v = h.v;
		h = h.h;
	}
	i = Math.floor(h * 6);
	f = h * 6 - i;
	p = v * (1 - s);
	q = v * (1 - f * s);
	t = v * (1 - (1 - f) * s);
	switch (i % 6) {
		case 0:
			r = v, g = t, b = p;
			break;
		case 1:
			r = q, g = v, b = p;
			break;
		case 2:
			r = p, g = v, b = t;
			break;
		case 3:
			r = p, g = q, b = v;
			break;
		case 4:
			r = t, g = p, b = v;
			break;
		case 5:
			r = v, g = p, b = q;
			break;
	}

	return {
		r: Math.round(r * 255),
		g: Math.round(g * 255),
		b: Math.round(b * 255)
	};

}

module.exports = function(XIBLE) {

	function constr(NODE) {

		let colorOut = NODE.addOutput('color', {
			type: "color.hex"
		});
/*
		let hueOut = NODE.addOutput('hue', {
			type: "color.hue"
		});

		let saturationOut = NODE.addOutput('saturation', {
			type: "color.saturation"
		});

		let brightnessOut = NODE.addOutput('brightness', {
			type: "color.brightness"
		});
*/
		colorOut.on('trigger', (conn, state, callback) => {

			let hex = 'ffffff';
			if (!isNaN(NODE.data.h) && !isNaN(NODE.data.s) && !isNaN(NODE.data.v)) {

				let rgb = hsvToRgb(+NODE.data.h, +NODE.data.s, (+NODE.data.v) / 100);
				hex = rgbToHex(rgb.r, rgb.g, rgb.b);

			}

			callback(hex);

		});

	}

	XIBLE.addNode('color', {
		type: "object",
		level: 0,
		description: "Returns a color object."
	}, constr);

};
