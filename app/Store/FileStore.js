const debug = require('debug');
const fs = require('fs');
const path = require('path');

// lazy requires
let fsExtra;

const storeDebug = debug('xible:filestore');

const DEFAULT_PATH = `${__dirname}/../../config.json`;

module.exports = (XIBLE) => {
  const { configPath } = XIBLE;
  let configLoadTries = -1;

  let flowPath;
  let vaultPath;

  let statuses = {};

  class FileStore {
    static init() {
      if (flowPath != null) {
        return;
      }

      flowPath = XIBLE.Config.getValue('flows.path');
      if (!flowPath) {
        throw new Error('no "flows.path" configured');
      }
      flowPath = XIBLE.resolvePath(flowPath);

      vaultPath = XIBLE.Config.getValue('vault.path');
      if (!vaultPath) {
        throw new Error('no "vault.path" configured');
      }
      vaultPath = XIBLE.resolvePath(vaultPath);

      // create the vault if it doesn't exist
      this.#createVault();
    }

    static #createConfig() {
      storeDebug(`creating "${configPath}"`);

      if (!fsExtra) {
        fsExtra = require('fs-extra');
      }

      try {
        fsExtra.copySync(DEFAULT_PATH, configPath);
        fs.chmodSync(configPath, 0o600);
        return true;
      } catch (err) {
        storeDebug(`could not create "${configPath}": ${err}`);
      }

      return false;
    }

    static saveConfig(configContents) {
      configContents = JSON.stringify(configContents, null, '\t');

      try {
        fs.writeFileSync(configPath, configContents, {
          mode: 0o600
        });
      } catch (err) {
        storeDebug(`failed to write config to "${configPath}": ${err}`);
        throw new Error(`failed to write config to "${configPath}": ${err}`);
      }
    }

    static loadConfig() {
      storeDebug(`loading "${configPath}"`);

      configLoadTries += 1;

      let configContents;
      try {
        configContents = fs.readFileSync(configPath, {
          encoding: 'utf8'
        });
      } catch (err) {
        storeDebug(`error reading "${configPath}": ${err}`);

        if (!configLoadTries && this.#createConfig(configPath)) {
          return this.loadConfig(configPath);
        }
        throw new Error(`failed to load config: ${err}`);
      }

      return JSON.parse(configContents);
    }

    /**
    * Validates if writing to the config file is possible/allowed
    * @returns {Promise} true or false
    */
    static validateConfigPermissions() {
      return new Promise((resolve) => {
        // check if we can write
        fs.access(configPath, fs.W_OK, (err) => {
          if (err) {
            resolve(false);
            return;
          }

          resolve(true);
        });
      });
    }

    static validateFlowPermissions() {
      return new Promise((resolve) => {
        if (!flowPath) {
          resolve(false);
        }

        // check if we can write
        fs.access(flowPath, fs.W_OK, (err) => {
          if (err) {
            resolve(false);
            return;
          }

          resolve(true);
        });
      });
    }

    static _isFlowFile(file) {
      const filePath = `${flowPath}/${file}`;

      return file.substring(0, 1) !== '_'
        && file.substring(0, 1) !== '.'
        && fs.statSync(filePath).isFile()
        && path.extname(filePath) === '.json';
    }

    static async getFlowJsons() {
      storeDebug(`get flows from "${flowPath}"`);

      // check that flowPath exists
      if (!fs.existsSync(flowPath)) {
        storeDebug(`creating "${flowPath}"`);
        fs.mkdirSync(flowPath);
      }

      const flows = [];

      // get the files in the flowPath
      let files;
      try {
        files = fs.readdirSync(flowPath);
      } catch (err) {
        storeDebug(`could not readdir "${flowPath}": ${err}`);
        files = [];
      }

      await Promise.all(files.map(async (file) => {
        try {
          if (!this._isFlowFile(file)) {
            return;
          }

          const flow = await this.getOneFlowJson(file.substring(0, file.length - 5));
          if (flow) {
            flows.push(flow);
          }
        } catch (err) {
          storeDebug(`could not init "${file}": ${err.stack}`);
        }
      }));

      return flows;
    }

    /**
     * @param {*} flowName
     * @returns {Promise<{}>} - The JSON definition for the flow.
     */
    static getOneFlowJson(flowName) {
      const fileName = `${flowName}.json`;
      return new Promise((resolve, reject) => {
        const filePath = `${flowPath}/${fileName}`;

        if (this._isFlowFile(fileName)) {
          fs.readFile(filePath, { encoding: 'utf8' }, (err, data) => {
            if (err) {
              reject(err);
              return;
            }

            try {
              const json = JSON.parse(data);
              if (json._id) {
                resolve(json);
              }
            } catch (flowParseErr) {
              reject(flowParseErr);
            }
          });
        } else {
          reject(`not a valid flow file: "${fileName}"`);
        }
      });
    }

    static saveFlow(flow) {
      return new Promise((resolve, reject) => {
        if (!flowPath) {
          reject('no flowPath specified');
          return;
        }

        storeDebug(`saving "${flow._id}"`);
        fs.writeFile(`${flowPath}/${flow._id}.json`, JSON.stringify(flow.json, null, '\t'), () => {
          resolve();
        });
      });
    }

    static deleteFlow(flow) {
      return new Promise((resolve, reject) => {
        if (!flowPath) {
          reject('no flowPath specified');
          return;
        }

        storeDebug(`deleting flow "${flow._id}"`);
        fs.unlink(`${flowPath}/${flow._id}.json`, () => {
          resolve();
        });
      });
    }

    static #saveFlowStatuses() {
      if (!flowPath) {
        return;
      }

      try {
        fs.writeFileSync(`${flowPath}/_status.json`, JSON.stringify(statuses));
      } catch (err) {
        storeDebug(`error saving status to "${flowPath}/_status.json": ${err}`);
      }
    }

    static async getFlowInstanceStatuses() {
      if (!flowPath) {
        throw new Error('Cannot get statuses; flows have not been loaded from path');
      }

      try {
        statuses = JSON.parse(fs.readFileSync(`${flowPath}/_status.json`));
        storeDebug(`found ${Object.keys(statuses).length} statuses`);
      } catch (err) {
        storeDebug(`"${flowPath}/_status.json" cannot be opened: ${err}`);
      }

      return statuses;
    }

    static async saveFlowInstanceStatus(flowName, flowInstanceId, status) {
      if (statuses[flowName] == null) {
        statuses[flowName] = [];
      }

      let targetStatus = statuses[flowName]
        .find((exStatus) => exStatus._id === flowInstanceId);
      if (targetStatus == null) {
        targetStatus = {};
        statuses[flowName].push(targetStatus);
      }

      Object.assign(targetStatus, status);

      this.#saveFlowStatuses();
    }

    static async deleteFlowInstanceStatus(flowName, flowInstanceId) {
      if (statuses[flowName] != null) {
        const targetStatusIndex = statuses[flowName]
          .findIndex((exStatus) => exStatus._id === flowInstanceId);

        if (targetStatusIndex > -1) {
          statuses[flowName].splice(targetStatusIndex, 1);
        }

        if (statuses[flowName].length === 0) {
          delete statuses[flowName];
        }
      }

      await this.#saveFlowStatuses();
    }

    static #createVault() {
      if (!fs.existsSync(vaultPath)) {
        storeDebug('creating new vault');
        fs.writeFileSync(vaultPath, '{}', {
          mode: 0o600
        });
      }
    }

    static getVaultContents() {
      let contents;
      try {
        contents = JSON.parse(fs.readFileSync(vaultPath));
      } catch (err) {
        storeDebug(`could not open "${vaultPath}"\n`, err);
      }

      return contents;
    }

    static saveVault(contents) {
      try {
        fs.writeFileSync(vaultPath, JSON.stringify(contents), {
          mode: 0o600
        });
      } catch (err) {
        storeDebug(`could not save "${vaultPath}"\n`, err);
      }
    }
  }

  return {
    FileStore
  };
};
