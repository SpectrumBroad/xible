'use strict';

const fsExtra = require('fs-extra');

module.exports = (XIBLE, EXPRESS_APP) => {
  class NodePack {
    constructor(obj = {}) {
      this.name = obj.name;
      this.path = obj.path;
    }

    static async getAll() {
      let nodesPath = XIBLE.Config.getValue('nodes.path');
      if (!nodesPath) {
        throw new Error('need a "nodes.path" in the configuration to load the installed nodes from');
      }
      nodesPath = XIBLE.resolvePath(nodesPath);

      const nodePacks = {};
      const nodePackDirs = fsExtra.readdirSync(nodesPath);

      for (let i = 0; i < nodePackDirs.length; i += 1) {
        if (!fsExtra.statSync(`${nodesPath}/${nodePackDirs[i]}`).isDirectory()) {
          continue;
        }

        nodePacks[nodePackDirs[i]] = new NodePack({
          name: nodePackDirs[i],
          path: `${nodesPath}/${nodePackDirs[i]}`
        });
      }

      return nodePacks;
    }

    /**
     * Fetches a nodePack by the given name,
     * @param {String} name
     * @returns {Promise.<NodePack|null>}
     */
    static async getByName(name) {
      const nodePacks = await this.getAll();
      return nodePacks[name];
    }

    /**
     * Removes the nodePack from the XIBLE installation.
     * @returns {Promise.<NodePack>} Returns the nodePack itself.
     * The path parameter will be set to null.
     */
    async remove() {
      if (!this.path || !fsExtra.statSync(this.path).isDirectory()) {
        throw new Error(`nodepack "${this.name}" is not installed`);
      }

      fsExtra.removeSync(this.path);
      this.path = null;
      return this;
    }
  }

  if (EXPRESS_APP) {
    require('./routes.js')(NodePack, XIBLE, EXPRESS_APP);
  }

  return {
    NodePack
  };
};
