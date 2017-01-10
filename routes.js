module.exports = function(XIBLE, EXPRESS_APP) {

	//redirect to index.htm from root
	EXPRESS_APP.get('/', (req, res) => {
		res.redirect('/index.htm');
	});

};
