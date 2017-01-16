module.exports = function(XIBLE, EXPRESS_APP) {

	EXPRESS_APP.get('/api/validateFlowPermissions', (req, res) => {

		XIBLE.Flow.validatePermissions().then((result) => {
			res.json(result);
		});

	});

	EXPRESS_APP.get('/api/persistentWebSocketMessages', (req, res) => {

		let messages = XIBLE.persistentWebSocketMessages;

		//send out any existing statuses
		let messageKeys = Object.keys(messages);
		if (!messageKeys.length) {
			return;
		}

		//map to array and return
		res.json(messageKeys.map((statusId) => messages[statusId]));

	});

	EXPRESS_APP.get('*', (req, res, next) => {

		//node editor content hosting
		if (/^\/api\/nodes\/[^\/]+\/editor\//.test(req.path)) {
			return next();
		}

		res.sendFile(`${__dirname}/editor/index.htm`);

	});

};
