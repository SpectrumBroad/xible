module.exports = function(XIBLE, EXPRESS, EXPRESS_APP) {

	const XibleRegistryWrapper = require('../../../xibleRegistryWrapper');

	let xibleRegistry = new XibleRegistryWrapper({
		url: XIBLE.Config.getValue('registry.nodes.url')
	});

	require('./routes.js')(xibleRegistry, XIBLE, EXPRESS_APP);

	return xibleRegistry;

};
