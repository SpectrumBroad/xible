module.exports = function(XIBLE) {

	function constr(NODE) {

		let twitterIn = NODE.addInput('twitter', {
			type: 'social.twitter'
		});

		let triggerOut = NODE.addOutput('trigger', {
			type: 'trigger'
		});

		let tweetOut = NODE.addOutput('tweet', {
			type: 'social.twitter.tweet'
		});

		let textOut = NODE.addOutput('text', {
			type: 'string'
		});

		tweetOut.on('trigger', (conn, state, callback) => {

			let thisState = state.get(this);
			callback((thisState && thisState.tweet) || null);

		});

		textOut.on('trigger', (conn, state, callback) => {

			let thisState = state.get(this);
			callback((thisState && thisState.tweet && thisState.tweet.text) || null);

		});

		NODE.on('init', (state) => {

			let type = NODE.data.type;
			if (!type) {
				return;
			}

			NODE.getValuesFromInput(twitterIn, state).then((twitters) => {

				twitters.forEach((twitter) => {

					if(!twitter) {
						return;
					}

					twitter.stream(type, {'track':NODE.data.track}, (stream) => {

						stream.on('data', (data) => {

							state.set(this, {
								tweet: data
							});
							NODE.triggerOutputs(triggerOut, state);

						});

						stream.on('limit', () => {
							console.log('ratelimit!');
						});

						stream.on('error', (tw, tc) => {
							console.log(tw, tc);
						});

						stream.on('end', () => {
console.log('end!');
						});

						stream.on('destroy', () => {
console.log('destroy!');
						});

					});

				});

			});

		});

	}

	XIBLE.addNode('social.twitter.ontweet', {
		type: 'event',
		level: 0,
		description: `Triggered whenever a tweet comes in on the given search tags.`
	}, constr);

};
