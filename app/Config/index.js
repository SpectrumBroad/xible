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

	function saveConfig(path, configContents) {

		configContents = JSON.stringify(configContents);

		try {
			fsExtra.writeFileSync(path, configContents);
		} catch (err) {

			configDebug(`failed to write config to "${path}": ${err}`);
			throw new Error(`failed to write config to "${path}": ${err}`);

		}

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

	let config, configPath;
	if (CONFIG_OBJ) {
		config = CONFIG_OBJ;
	} else if (XIBLE.configPath) {

		configPath = XIBLE.configPath;
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

		/**
		 * Deletes a value from the configuration.
		 * Results are written of the the config path if that's how xible was loaded.
		 * @param {String} path the json path, dot notated, in the config.
		 * @returns {Boolean} boolean indicating whether indeed something was deleted.
		 */
		static deleteValue(path) {

			let pathSplit = path.split('.');
			let sel = config;

			for (let i = 0; i < pathSplit.length - 1; ++i) {

				let part = pathSplit[i];
				if (sel.hasOwnProperty(part)) {
					sel = sel[part];
				} else {
					return false;
				}

			}

			delete sel[pathSplit.pop()];

			if (configPath) {
				saveConfig(configPath, config);
			}

			return true;

		}

		/**
		 * Sets a value in the configuration.
		 * If any part of the path does not exist, it is created.
		 * Results are written of the the config path if that's how xible was loaded.
		 * @param {String} path the json path, dot notated, in the config.
		 * @param {String|Number|Boolean|Date} value the value to set
		 */
		static setValue(path, value) {

			if (['string', 'number', 'boolean', 'date'].indexOf(typeof value) === -1) {
				throw new Error(`Param "value" should be of type "string", "number", "boolean" or "date"`);
			}

			let pathSplit = path.split('.');
			let sel = config;

			for (let i = 0; i < pathSplit.length - 1; ++i) {

				let part = pathSplit[i];
				if (sel.hasOwnProperty(part)) {
					sel = sel[part];
				} else {
					sel = sel[part] = {};
				}

			}

			sel[pathSplit.pop()] = value;

			if (configPath) {
				saveConfig(configPath, config);
			}

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
