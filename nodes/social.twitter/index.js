const TwitterNg = require('twitter-ng');

const CONSUMER_KEY = 'BnQEOrezeCOwWAMOYGh5yVKIf';
const CONSUMER_SECRET = 'zKYMMxP3G4tbgTg0108j1Ye8soUd4krqJIcAOeQYNK33CzQezH';

module.exports = function(NODE) {

	let twitter;

	function connect() {

		twitter = new TwitterNg({
			consumer_key: CONSUMER_KEY,
			consumer_secret: CONSUMER_SECRET,
			access_token_key: NODE.data.oAuthAccessToken,
			access_token_secret: NODE.data.oAuthAccessTokenSecret
		});

		NODE.removeAllStatuses();

		twitter.verifyCredentials((err, data) => {

			if (err) {

				let errData, errMessage;
				if (err.data) {

					errData = JSON.parse(err.data);
					errMessage = errData && errData.errors && errData.errors.length && errData.errors[0].message;

					if (errMessage) {
						NODE.setTracker({
							color: 'red',
							message: errMessage
						});
					}

				}

				NODE.addStatus({
					color: 'red',
					message: `disconnected`
				});

			} else {

				NODE.addStatus({
					color: 'green',
					message: `connected as "${NODE.data.screenName}"`
				});

			}

		});

	}

	//return reference glow
	let twitterOut = NODE.getOutputByName('twitter');
	twitterOut.on('trigger', (conn, state, callback) => {

		if (!twitter) {

			NODE.once('init', () => callback(twitter));
			return;

		}

		callback(twitter);

	});

	NODE.on('init', () => {

		const express = require('express');
		const bodyParser = require('body-parser');
		const spdy = require('spdy');
		const fs = require('fs');

		//if we have the oAuth keys, setup twitter right away
		if (NODE.data.oAuthAccessToken && NODE.data.oAuthAccessTokenSecret) {
			connect();
		} else {

			NODE.addStatus({
				color: 'orange',
				message: 'require authentication'
			});

		}

		//host a webserver for auth requests
		let expressApp = express();
		expressApp.use(bodyParser.json());

		//setup default express stuff
		expressApp.use((req, res, next) => {

			res.removeHeader('X-Powered-By');

			//disable caching
			res.header('cache-control', 'private, no-cache, no-store, must-revalidate');
			res.header('expires', '-1');
			res.header('pragma', 'no-cache');

			//access control
			res.header('access-control-allow-origin', '*');
			res.header('access-control-allow-headers', 'x-access-token, content-type');
			res.header('access-control-allow-methods', 'GET,PUT,POST,PATCH,DELETE,OPTIONS,HEAD');

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

		let oAuthRequestToken;
		let oAuthRequestTokenSecret;

		expressApp.get(`/${NODE._id}/auth`, (req, res, next) => {

			let tempTwitter = new TwitterNg({
				consumer_key: CONSUMER_KEY,
				consumer_secret: CONSUMER_SECRET
			});

			tempTwitter.oauth.getOAuthRequestToken({
				oauth_callback: `https://${req.hostname}:9620/${NODE._id}/auth/callback`
			}, (err, token, tokenSecret, results) => {

				if (err) {

					NODE.addStatus({
						color: 'red',
						message: err,
						timeout: 5000
					});
					console.log(err);
					res.status(500).end();
					return;

				} else if (!(results && results.oauth_callback_confirmed == 'true')) {

					console.log(`callback not confirmed`);
					res.status(500).end();
					return;

				} else {

					oAuthRequestToken = token;
					oAuthRequestTokenSecret = tokenSecret;
					res.redirect(`https://api.twitter.com/oauth/authorize?oauth_token=${token}`);

				}

			});

		});

		expressApp.get(`/${NODE._id}/auth/callback`, (req, res) => {

			let tempTwitter = new TwitterNg({
				consumer_key: CONSUMER_KEY,
				consumer_secret: CONSUMER_SECRET
			});

			tempTwitter.oauth.getOAuthAccessToken(oAuthRequestToken, oAuthRequestTokenSecret, req.query.oauth_verifier, (err, oAuthAccessToken, oAuthAccessTokenSecret, results) => {

				if (err) {

					NODE.addStatus({
						color: 'red',
						message: err,
						timeout: 5000
					});

					res.status(500).end();
					return;

				} else {

					//store the values in the vault
					NODE.vault.set({
						oAuthAccessToken: oAuthAccessToken,
						oAuthAccessTokenSecret: oAuthAccessTokenSecret,
						screenName: results.screen_name
					});

					connect();

					res.sendFile('authSuccess.htm', {
						root: __dirname
					});

				}

			});

		});

	});

};
