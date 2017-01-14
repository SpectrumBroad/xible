module.exports = function(XIBLE, EXPRESS_APP) {

	EXPRESS_APP.get('/api/valPerm', (req, res) => {

	});

	EXPRESS_APP.get('*', (req, res, next) => {

		//node editor content hosting
		if(/^\/api\/nodes\/[^\/]+\/editor\//.test(req.path)) {
			return next();
		}

		res.sendFile(`${__dirname}/editor/index.htm`);

	});

};
