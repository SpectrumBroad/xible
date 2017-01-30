module.exports = function(XIBLE, EXPRESS_APP) {

	const XibleRegistryWrapper = require('../../../xibleRegistryWrapper');

	let xibleRegistry = new XibleRegistryWrapper({
		url: XIBLE.Config.getValue('nodes.registry.url')
	});

	xibleRegistry.Node.prototype.install = function() {

		return this.getTarballUrl().then((tarballUrl) => {

			console.log(`${__dirname}/registryTmp/`);

			//fork an npm to install the registry url
			const fork = require('child_process').spawn;
			const npm = fork(`npm`, ['install', tarballUrl], {
				cwd: `${__dirname}/../../registryTmp/`
			});

			npm.on('error', (err) => {
				return Promise.reject(err);
			});

			npm.on('exit', (exitCode) => {

				if (exitCode) {
					return Promise.reject(`exited with code: ${exitCode}`);
				}

				Promise.resolve();

			});

			npm.stdout.on('data', (data) => {
				console.log(data.toString());
			});

			npm.stderr.on('data', (data) => {
				console.log(data.toString());
			});

		});

	};

	if (EXPRESS_APP) {
		require('./routes.js')(xibleRegistry, XIBLE, EXPRESS_APP);
	}

	return {
		Registry: xibleRegistry
	};

};
