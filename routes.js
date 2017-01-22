module.exports = function(XIBLE, EXPRESS_APP) {

	EXPRESS_APP.get('/api/validateFlowPermissions', (req, res) => {

		XIBLE.Flow.validatePermissions().then((result) => {
			res.json(result);
		});

	});

	//send out any existing statuses
	EXPRESS_APP.get('/api/persistentWebSocketMessages', (req, res) => {
		res.json(XIBLE.persistentWebSocketMessages);
	});

	EXPRESS_APP.get('*', (req, res, next) => {

		//node editor content hosting
		if (/^\/api\/nodes\/[^\/]+\/editor\//.test(req.path)) {
			return next();
		}

		res.sendFile(`${__dirname}/editor/index.htm`);

	});

};
