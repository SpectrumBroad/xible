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

			const express = require('express');
			const bodyParser = require('body-parser');
			const spdy = require('spdy');
			const fs = require('fs');

			//host a webserver for auth requests
			let expressApp = express();
			expressApp.use(bodyParser.json());

			//setup default express stuff
			expressApp.use(function(req, res, next) {

				res.removeHeader('X-Powered-By');

				//disable caching
				res.header('cache-control', 'private, no-cache, no-store, must-revalidate');
				res.header('expires', '-1');
				res.header('pragma', 'no-cache');

				//access control
				res.header('access-control-allow-origin', '*');
				res.header('access-control-allow-headers', 'x-access-token, content-type');
				res.header('access-control-allow-methods', 'GET,PUT,POST,PATCH,DELETE,OPTIONS,HEAD');

				NODE.addStatus({
					message: `${req.method} ${req.originalUrl}`,
					timeout: 1000
				});

				if ('OPTIONS' === req.method) {
					return res.status(200).end();
				}

				//local vars for requests
				req.locals = {};

				next();

			});

			const spdyServer = spdy.createServer({
				key: fs.readFileSync('./ssl/ssl.key'),
				cert: fs.readFileSync('./ssl/ssl.crt')
			}, expressApp).listen(9620, () => {});

			let oAuthToken;
			let oAuthTokenSecret;

			let oAuthAccessToken;
			let oAuthAccessTokenSecret;

			expressApp.get(`/auth`, (req, res, next) => {

				twitter = new TwitterNg({
					consumer_key: CONSUMER_KEY,
					consumer_secret: CONSUMER_SECRET
				});

				twitter.oauth.getOAuthRequestToken({
					oauth_callback: 'https://10.0.0.20:9620/auth/callback'
				}, (err, token, tokenSecret, results) => {

					if (err) {

						console.log(err);
						res.status(500).end();
						return;

					} else if (!(results && results.oauth_callback_confirmed == 'true')) {

						console.log(`callback not confirmed`);
						res.status(500).end();
						return;

					} else {

						oAuthToken = token;
						oAuthTokenSecret = tokenSecret;
						res.redirect(`https://api.twitter.com/oauth/authorize?oauth_token=${token}`);

					}

				});


			});

			expressApp.get(`/auth/callback`, (req, res) => {

				twitter = new TwitterNg({
					consumer_key: CONSUMER_KEY,
					consumer_secret: CONSUMER_SECRET,
				});

				twitter.oauth.getOAuthAccessToken(oAuthToken, oAuthTokenSecret, req.query.oauth_verifier, (err, accessToken, accessTokenSecret, results) => {

					if (err) {

						console.log(err);
						res.status(500).end();
						return;

					} else {

						oAuthAccessToken = oAuthToken;
						oAuthAccessTokenSecret = oAuthTokenSecret;

						res.send('success');

					}

				});


			});

		});

	}

	FLUX.addNode('social.twitter', {
		type: 'object',
		level: 0,
		groups: ['social']
	}, constr);

};
