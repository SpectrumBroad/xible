module.exports = function(Config, XIBLE, EXPRESS_APP) {

	EXPRESS_APP.get('/api/config', (req, res) => {

	});

	EXPRESS_APP.get('/api/config/validatePermissions', (req, res) => {
		Config.validatePermissions().then((result) => {
			res.json(result);
		});
	});

};
