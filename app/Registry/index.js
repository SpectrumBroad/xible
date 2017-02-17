module.exports = function(XIBLE, EXPRESS_APP) {

	const XibleRegistryWrapper = require('../../../xibleRegistryWrapper');
	const fsExtra = require('fs-extra');

	let registryUrl = XIBLE.Config.getValue('registry.url');
	if (!registryUrl) {
		throw new Error(`"registry.url" not found in config`);
	}

	let xibleRegistry = new XibleRegistryWrapper({
		url: registryUrl
	});

	//the tmp path for downloading this node
	const TMP_REGISTRY_DIR = `/tmp/xibleRegistryTmp`;

	function cleanUp() {

		return new Promise((resolve, reject) => {

			//remove the tmp dir
			fsExtra.remove(TMP_REGISTRY_DIR, (err) => {

				if (err) {
					return reject(err);
				}

				resolve();

			});

		});

	}

	xibleRegistry.Node.prototype.install = function() {

		let nodePath = XIBLE.Config.getValue('nodes.path');
		if (!nodePath) {
			return Promise.reject(`no "nodes.path" configured`);
		}
		nodePath = XIBLE.resolvePath(nodePath);

		//get the registrydata
		return this.getRegistryData().then((registryData) => {

			if (!registryData.name) {
				return Promise.reject(`No "name" field found in the registry data for node "${this.name}"`);
			}

			return this.getTarballUrl().then((tarballUrl) => {

				return new Promise((resolve, reject) => {

					//clean the dir
					fsExtra.emptyDir(TMP_REGISTRY_DIR, (err) => {

						if (err) {
							return reject(err);
						}

						//create a package.json so npm knows where the root lies
						fsExtra.copy(`package.json`, `${TMP_REGISTRY_DIR}/package.json`, (err) => {

							if (err) {
								return reject(err);
							}

							//fork an npm to install the registry url
							const fork = require('child_process').spawn;
							const npm = fork(`npm`, ['install', tarballUrl], {
								cwd: TMP_REGISTRY_DIR
							});

							npm.on('error', (err) => {
								return reject(err);
							});

							npm.on('exit', (exitCode) => {

								if (exitCode) {
									return reject(`exited with code: ${exitCode}`);
								}

								//specify the dir where this node will be installed
								let nodeDestDir = `${nodePath}/${this.name}`;

								//remove existing node directory
								fsExtra.emptyDir(nodeDestDir, (err) => {

									if (err) {
										return reject(err);
									}

									//first move the node itself
									fsExtra.move(`${TMP_REGISTRY_DIR}/node_modules/${registryData.name}`, nodeDestDir, {
										overwrite: true
									}, (err) => {

										if (err) {
											return reject(err);
										}

										//check if there's anything left in node_modules
										fsExtra.readdir(`${TMP_REGISTRY_DIR}/node_modules`, (err, files) => {

											if (err) {
												return reject(err);
											}

											if (!files.length) {

												return cleanUp().then(() => {
													resolve();
												}).catch((err) => {
													reject(err);
												});

											}

											//move the rest of the node_modules
											fsExtra.move(`${TMP_REGISTRY_DIR}/node_modules`, `${nodeDestDir}/node_modules`, {
												overwrite: true
											}, (err) => {

												if (err) {
													return reject(err);
												}

												cleanUp().then(() => {
													resolve();
												}).catch((err) => {
													reject(err);
												});

											});

										});

									});

								});

							});

							npm.stdout.on('data', (data) => {
								console.log(data.toString());
							});

							npm.stderr.on('data', (data) => {
								console.log(data.toString());
							});

						});

					});

				});

			});

		}).catch((err) => {

			return cleanUp().then(() => {
				return Promise.reject(err);
			}).catch((newErr) => {
				return Promise.reject(err);
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
