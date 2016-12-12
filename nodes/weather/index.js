const https = require('https');

module.exports = function(FLUX) {

	function getWeatherInfo(location, date, unit, callback) {

		https.get(`https://query.yahooapis.com/v1/public/yql?format=json&q=` + encodeURIComponent(`select * from weather.forecast where woeid in (select woeid from geo.places(1) where text="${location}") and u="${unit}"`), res => {

			let body = '';
			res.setEncoding('utf8');

			res.on('data', chunk => {
				body += chunk;
			});

			res.on('end', () => {

				let json = JSON.parse(body);

				let weather = null;
				if (json.query && json.query.results && json.query.results.channel) {
					weather = {
						atmosphere: json.query.results.channel.atmosphere,
						condition: json.query.results.channel.item.condition
					};
				}

				callback(weather);

			});

		});

	}

	function constr(NODE) {

		let locationIn = NODE.addInput('location', {
			type: "string"
		});

		let dateIn = NODE.addInput('date', {
			type: "date"
		});

		let tempOut = NODE.addOutput('temperature', {
			type: "math.number"
		});

		tempOut.on('trigger', (conn, state, callback) => {

			NODE.getValuesFromInput(locationIn, state).then((locations) => {

				NODE.getValuesFromInput(dateIn, state).then((dates) => {

					var result = [];

					if (!locations.length && NODE.data.location) {
						locations.push(NODE.data.location);
					}

					if (!dates.length) {
						dates.push(new Date());
					}

					let doneCount = 0;
					let resultCount = locations.length * dates.length;

					locations.forEach((location) => {

						dates.forEach((date) => {

							getWeatherInfo(location, date, 'c', (weather) => {

								if (weather) {
									result.push(weather.condition.temp);
								}

								//text (cloud)

								if (++doneCount === resultCount) {
									callback(result);
								}

							});
						});

					});

					if (!locations.length) {
						callback(result);
					}

				});

			});

		});

	}

	FLUX.addNode('weather', {
		type: "object",
		level: 0,
		description: "Retrieve the weather for a specific location using the yahoo API."
	}, constr);

};
