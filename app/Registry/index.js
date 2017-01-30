module.exports = function(XIBLE, EXPRESS_APP) {

	const XibleRegistryWrapper = require('../../../xibleRegistryWrapper');
	const fsExtra = require('fs-extra');

	let xibleRegistry = new XibleRegistryWrapper({
		url: XIBLE.Config.getValue('nodes.registry.url')
	});

	xibleRegistry.Node.prototype.install = function() {

		return this.getTarballUrl().then((tarballUrl) => {

			//the tmp path for downloading this node
			let tmpRegistryDir = `${__dirname}/../../registryTmp`;

			//clean the dir
			fsExtra.emptyDir(tmpRegistryDir, (err) => {

				if (err) {
					return Promise.reject(err);
				}

				//fork an npm to install the registry url
				const fork = require('child_process').spawn;
				const npm = fork(`npm`, ['install', tarballUrl], {
					cwd: tmpRegistryDir
				});

				npm.on('error', (err) => {
					return Promise.reject(err);
				});

				npm.on('exit', (exitCode) => {

					if (exitCode) {
						return Promise.reject(`exited with code: ${exitCode}`);
					}

					//specify the dir where this node will be installed
					let nodeDestDir = `${__dirname}/../../nodes/${this.name}`;

					//remove existing node directory
					fsExtra.emptyDir(nodeDestDir, (err) => {

						if (err) {
							return Promise.reject(err);
						}

						//first move the node itself
						fsExtra.move(`${tmpRegistryDir}/node_modules/${this.name}`, `${nodeDestDir}/${this.name}`, {true}, (err) => {

							if (err) {
								return Promise.reject(err);
							}

							//move the rest of the node_modules
							fsExtra.move(`${tmpRegistryDir}/node_modules`, `${nodeDestDir}/${this.name}/node_modules`, {true}, (err) => {

								if (err) {
									return Promise.reject(err);
								}

								Promise.resolve();

							});

						});

					});

					Promise.resolve();

				});

				npm.stdout.on('data', (data) => {
					console.log(data.toString());
				});

				npm.stderr.on('data', (data) => {
					console.log(data.toString());
				});

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
