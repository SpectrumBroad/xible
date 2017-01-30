const fs = require('fs');

module.exports = function(XIBLE, EXPRESS_APP) {

	let config;
	if (XIBLE.configPath) {
		config = require(`../../${XIBLE.configPath}`);
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
				fs.access(XIBLE.configPath, fs.W_OK, function(err) {

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
