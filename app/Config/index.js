const fsExtra = require('fs-extra');
const debug = require('debug');
const configDebug = debug('xible:config');

const DEFAULT_PATH = `${__dirname}/../../config.json`;

module.exports = function(XIBLE, EXPRESS_APP, CONFIG_OBJ) {

	function createConfig(path) {

		configDebug(`creating "${path}"`);

		try {

			fsExtra.copySync(DEFAULT_PATH, path);
			return true;

		} catch (err) {
			configDebug(`could not create "${path}": ${err}`);
		}

		return false;

	}

	let loadTries = -1;
	function loadConfig(path) {

		configDebug(`loading "${path}"`);

		++loadTries;

		let configContents;
		try {

			configContents = fsExtra.readFileSync(path, {
				encoding: 'utf8'
			});

		} catch (err) {

			configDebug(`error reading "${path}": ${err}`);

			if (!loadTries && createConfig(path)) {
				return loadConfig(path);
			} else {
				throw new Error(`failed to load config`);
			}

		}

		return JSON.parse(configContents);

	}

	let config;
	if (CONFIG_OBJ) {
		config = CONFIG_OBJ;
	} else if (XIBLE.configPath) {
		config = loadConfig(XIBLE.configPath);
	} else {
		throw new Error(`need a configPath`);
	}

	/**
	 *	Config class
	 */
	class Config {

		/**
		 * Validates if writing to the config file is possible/allowed
		 * @returns {Promise}  true or false
		 */
		static validatePermissions() {

			return new Promise((resolve, reject) => {

				//check if we can write
				fsExtra.access(XIBLE.configPath, fsExtra.W_OK, (err) => {

					if (err) {
						return resolve(false);
					}

					resolve(true);

				});

			});

		}

		static deleteValue(path) {

		}

		static setValue(path, value) {

		}

		static getValue(path) {

			let pathSplit = path.split('.');
			let sel = config;

			for (let i = 0; i < pathSplit.length; ++i) {

				let part = pathSplit[i];
				if (sel.hasOwnProperty(part)) {
					sel = sel[part];
				} else {
					return null;
				}

			}

			return sel;

		}

		static getAll() {
			return config;
		}

	}

	if (EXPRESS_APP) {
		require('./routes.js')(Config, XIBLE, EXPRESS_APP);
	}

	return {
		Config: Config
	};

};
