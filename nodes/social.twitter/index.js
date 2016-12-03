const TwitterNg = require('twitter-ng');

const CONSUMER_KEY = 'BnQEOrezeCOwWAMOYGh5yVKIf';
const CONSUMER_SECRET = 'zKYMMxP3G4tbgTg0108j1Ye8soUd4krqJIcAOeQYNK33CzQezH';

module.exports = function(FLUX) {

	function constr(NODE) {

		let twitter;

		let twitterOut = NODE.addOutput('twitter', {
			type: 'social.twitter'
		});

		//return reference glow
		twitterOut.on('trigger', (conn, state, callback) => {

			if (!twitter) {

				this.once('init', () => callback(twitter));
				return;

			}

			callback(twitter);

		});

		NODE.on('init', () => {

      NODE.express().get('auth', (req, res) => {
        res.send('boe');
      });

			twitter = new TwitterNg({
				consumer_key: CONSUMER_KEY,
				consumer_secret: CONSUMER_SECRET,
				access_token_key: 'keys',
				access_token_secret: 'secret'
			});

		});

	}

	FLUX.addNode('social.twitter', {
		type: 'object',
		level: 0,
		groups: ['social']
	}, constr);

};
