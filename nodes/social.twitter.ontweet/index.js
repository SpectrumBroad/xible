module.exports = function(XIBLE) {

	function constr(NODE) {

		let twitterIn = NODE.addInput('twitter', {
			type: 'social.twitter'
		});

		let triggerOut = NODE.addOutput('trigger', {
			type: 'trigger'
		});

		let tweetOut = NODE.addOutput('tweet', {
			type: 'document'
		});

		let textOut = NODE.addOutput('text', {
			type: 'string'
		});

		let userNameOut = NODE.addOutput('username', {
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

		userNameOut.on('trigger', (conn, state, callback) => {

			let thisState = state.get(this);
			callback((thisState && thisState.tweet && thisState.tweet.user && thisState.tweet.user.screen_name) || null);

		});

		NODE.on('init', (state) => {

			let type = NODE.data.type;
			if (!type) {
				return;
			}

			twitterIn.getValues(state).then((twitters) => {

				twitters.forEach((twitter) => {

					if (!twitter) {
						return;
					}

					let rateLimitStatus;
					let rateLimitTrack = 0;

					twitter.stream(type, {
						'track': NODE.data.track
					}, (stream) => {

						stream.on('data', (data) => {

							state.set(this, {
								tweet: data
							});
							NODE.triggerOutput(triggerOut, state);

						});

						//indicates that we're exceeding the rate limit set on streaming data
						//TODO: add orange status when this happens, including amount of missed tweets
						stream.on('limit', (data) => {

							//this data is not in sync, so only apply highest limit
							if (data.track <= rateLimitTrack) {
								return;
							}
							rateLimitTrack = data.track;

							if (rateLimitStatus) {

								this.updateStatusById(rateLimitStatus, {
									color: 'orange',
									message: `Ratelimit; missed ${rateLimitTrack} tweets`
								});

							} else {

								rateLimitStatus = this.addStatus({
									color: 'orange',
									message: `Ratelimit; missed ${rateLimitTrack} tweets`
								});

							}

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
