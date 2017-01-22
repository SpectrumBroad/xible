module.exports = function(XIBLE, EXPRESS, EXPRESS_APP) {

	const XibleRegistryWrapper = require('../../../xibleRegistryWrapper');

	let xibleRegistry = new XibleRegistryWrapper({
		url: XIBLE.Config.getValue('nodes.registry.url')
	});

	if(EXPRESS_APP) {
		require('./routes.js')(xibleRegistry, XIBLE, EXPRESS_APP);
	}

	return xibleRegistry;

};
