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

	//non existing views
	EXPRESS_APP.get('/views/*.js', (req, res, next) => {
		res.status(404).end();
	});

	EXPRESS_APP.get('*', (req, res, next) => {

		//node editor content hosting
		if (/^\/api\/nodes\/[^\/]+\/editor\//.test(req.path)) {
			return next();
		}

		res.sendFile(`${__dirname}/editor/index.htm`);

	});

};
