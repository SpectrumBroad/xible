const https = require('https');

module.exports = function(flux) {

	var getWeatherInfo = function(location, date, unit, callback) {

		https.get(`https://query.yahooapis.com/v1/public/yql?format=json&rnd=${date.getFullYear()}${date.getMonth()}${date.getDay()}${date.getHours()}&diagnostics=true&q=` + encodeURIComponent(`select * from weather.forecast where woeid in (select woeid from geo.places(1) where text="${location}") and u="${unit}"`), res => {

			var body = "";
			res.setEncoding('utf8');

			res.on('data', chunk => {
				body += chunk;
			});

			res.on('end', () => {

				var json = JSON.parse(body);

				var weather = null;
				if (json.query && json.query.results && json.query.results.channel) {
					weather = {
						atmosphere: json.query.results.channel.atmosphere,
						condition: json.query.results.channel.item.condition
					};
				}

				callback(weather);

			});

		});

	};

	var constructorFunction = function() {

		var node = new flux.Node({
			name: "weather",
			type: "object",
			level: 0,
			groups: ["basics"],
			description: "Retrieve the weather for a specific location.",
			editorContent: `<input data-hideifattached="input[name=location]" data-outputvalue="location" type="text" placeholder="location"/>`
		});

		var locationIn = node.addInput({
			name: "location",
			type: "string"
		});

		var dateIn = node.addInput({
			name: "date",
			type: "date"
		});

		var tempOut = node.addOutput({
			name: "temperature",
			type: "number"
		});

		tempOut.on('trigger', function(callback) {

			flux.Node.getValuesFromInput(this.node.inputs[0], locations => {

				flux.Node.getValuesFromInput(this.node.inputs[1], dates => {

					var result = [];

					if (!locations.length && this.node.data.location) {
						locations.push(this.node.data.location);
					}

					if (!dates.length) {
						dates.push(new Date());
					}

					var doneCount = 0;
					var resultCount = locations.length * dates.length;

					locations.forEach(location => {

						dates.forEach(date => {

							getWeatherInfo(location, date, 'c', function(weather) {

                if(weather) {
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

		return node;

	};

	flux.addNode('weather', constructorFunction);

};
