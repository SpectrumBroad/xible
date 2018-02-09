'use strict';

const EventEmitter = require('events').EventEmitter;
const debug = require('debug');
const fs = require('fs');

// lazy requires
let fsExtra;

const configDebug = debug('xible:config');

const DEFAULT_PATH = `${__dirname}/../../config.json`;

module.exports = (XIBLE, EXPRESS_APP, CONFIG_OBJ) => {
  function createConfig(path) {
    configDebug(`creating "${path}"`);

    if (!fsExtra) {
      fsExtra = require('fs-extra');
    }

    try {
      fsExtra.copySync(DEFAULT_PATH, path);
      fs.chmodSync(path, 0o600);
      return true;
    } catch (err) {
      configDebug(`could not create "${path}": ${err}`);
    }

    return false;
  }

  function saveConfig(path, configContents) {
    configContents = JSON.stringify(configContents, null, '\t');

    try {
      fs.writeFileSync(path, configContents, {
        mode: 0o600
      });
    } catch (err) {
      configDebug(`failed to write config to "${path}": ${err}`);
      throw new Error(`failed to write config to "${path}": ${err}`);
    }
  }

  let loadTries = -1;

  function loadConfig(path) {
    configDebug(`loading "${path}"`);

    loadTries += 1;

    let configContents;
    try {
      configContents = fs.readFileSync(path, {
        encoding: 'utf8'
      });
    } catch (err) {
      configDebug(`error reading "${path}": ${err}`);

      if (!loadTries && createConfig(path)) {
        return loadConfig(path);
      }
      throw new Error('failed to load config');
    }

    return JSON.parse(configContents);
  }

  let config;
  let configPath;
  if (CONFIG_OBJ) {
    config = CONFIG_OBJ;
  } else if (XIBLE.configPath) {
    configPath = XIBLE.configPath;
    config = loadConfig(XIBLE.configPath);
  } else {
    throw new Error('need a configPath');
  }

  /**
  * Config class
  */
  class Config {
    /**
    * Validates if writing to the config file is possible/allowed
    * @returns {Promise} true or false
    */
    static validatePermissions() {
      return new Promise((resolve) => {
        // check if we can write
        fs.access(XIBLE.configPath, fs.W_OK, (err) => {
          if (err) {
            resolve(false);
            return;
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
      const pathSplit = path.split('.');
      let sel = config;

      for (let i = 0; i < pathSplit.length - 1; i += 1) {
        const part = pathSplit[i];
        if (sel.hasOwnProperty(part)) { // eslint-disable-line
          sel = sel[part];
        } else {
          return false;
        }
      }

      delete sel[pathSplit.pop()];

      // emit
      this.emit('deleteValue', path);
      XIBLE.broadcastWebSocket({
        method: 'xible.config.deleteValue',
        path
      });

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
        throw new Error('Param "value" should be of type "string", "number", "boolean" or "date"');
      }

      const pathSplit = path.split('.');
      let sel = config;

      for (let i = 0; i < pathSplit.length - 1; i += 1) {
        const part = pathSplit[i];
        if (sel.hasOwnProperty(part)) { // eslint-disable-line
          sel = sel[part];
        } else {
          sel = sel[part] = {};
        }
      }

      sel[pathSplit.pop()] = value;

      // emit
      this.emit('setValue', path, value);
      XIBLE.broadcastWebSocket({
        method: 'xible.config.setValue',
        path,
        value
      });

      if (configPath) {
        saveConfig(configPath, config);
      }
    }

    static getValue(path) {
      const pathSplit = path.split('.');
      let sel = config;

      for (let i = 0; i < pathSplit.length; i += 1) {
        const part = pathSplit[i];
        if (sel.hasOwnProperty(part)) { // eslint-disable-line
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

  // statically hook eventemitter
  Object.assign(Config, EventEmitter.prototype);
  EventEmitter.call(Config);

  if (EXPRESS_APP) {
    require('./routes.js')(Config, XIBLE, EXPRESS_APP);
  }

  return {
    Config
  };
};
