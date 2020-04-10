'use strict';

const fsExtra = require('fs-extra');

// lazy requires
let express;

let constructed;

module.exports = (XIBLE, EXPRESS_APP) => {
  class NodePack {
    constructor(obj = {}) {
      this.name = obj.name;
      this.path = obj.path;
      this.version = obj.version;
      this.nodes = obj.nodes || [];
      this.installedByDefault = !!obj.installedByDefault;

      if (constructed) {
        constructed[this.name] = this;
      }
    }

    static getBaseName(nodePackName) {
      nodePackName = nodePackName.toLowerCase();
      if (nodePackName.substring(0, 15) === 'xible-nodepack-') {
        nodePackName = nodePackName.substring(15);
      } else if (nodePackName.substring(0, 9) === 'xible-np-') {
        nodePackName = nodePackName.substring(9);
      }

      return nodePackName;
    }

    static get DEFAULT_NODEPACK_NAMES() {
      return [
        'xible-np-xible',
        'xible-np-core',
        'xible-np-compare',
        'xible-np-console',
        'xible-np-input',
        'xible-np-object',
        'xible-np-string',
        'xible-nodepack-math',
        'xible-nodepack-stream',
        'xible-nodepack-filesystem',
        'xible-nodepack-process',
        'xible-nodepack-timing'
      ];
    }

    /**
     * Returns a map with all nodepacks installed by default.
     * These nodepacks are within the node_modules directory of Xible,
     * And specified in the package.json.
     */
    static getDefault() {
      const nodePacks = {};
      this.DEFAULT_NODEPACK_NAMES.forEach((defaultNodePackName) => {
        const baseName = this.getBaseName(defaultNodePackName);
        nodePacks[baseName] = this.getOneByPath(`${__dirname}/../../node_modules/${defaultNodePackName}`, baseName);
        nodePacks[baseName].installedByDefault = true;
      });

      return nodePacks;
    }

    static getOneByPath(path, nodePackName) {
      if (!fsExtra.statSync(path).isDirectory()) {
        return null;
      }

      const packageJsonPath = `${path}/package.json`;
      if (!fsExtra.existsSync(packageJsonPath)) {
        return null;
      }

      let packageJson;
      try {
        packageJson = require(packageJsonPath);
      } catch (err) {
        console.error(err);
        return null;
      }

      return new NodePack({
        name: nodePackName,
        version: packageJson.version,
        path
      });
    }

    static getByPath(nodesPath) {
      const nodePacks = {};
      const nodePackDirs = fsExtra.readdirSync(nodesPath);

      for (let i = 0; i < nodePackDirs.length; i += 1) {
        const nodePack = this.getOneByPath(`${nodesPath}/${nodePackDirs[i]}`, nodePackDirs[i]);
        if (!nodePack) {
          continue;
        }

        nodePacks[nodePack.name] = nodePack;
      }

      return nodePacks;
    }

    static async getAll() {
      if (constructed) {
        return constructed;
      }

      let nodesPath = XIBLE.Config.getValue('nodes.path');
      if (!nodesPath) {
        throw new Error('need a "nodes.path" in the configuration to load the installed nodes from');
      }
      nodesPath = XIBLE.resolvePath(nodesPath);

      // Check that nodePath exists. Try to create the path if it does not exist.
      if (!fsExtra.existsSync(nodesPath)) {
        console.error(`creating "${nodesPath}"`);

        try {
          fsExtra.mkdirSync(nodesPath);
        } catch (err) {
          console.error(`creation of "${nodesPath}" failed: `, err);
        }
        return {};
      }

      const nodePacks = this.getDefault();
      Object.assign(nodePacks, this.getByPath(`${__dirname}/../../nodes`));
      Object.assign(nodePacks, this.getByPath(nodesPath));

      constructed = nodePacks;

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

    getNodeStructures() {
      return XIBLE.Node.getStructures(this.path);
    }

    /**
     * Initializes all nodes and typedefs found within the path of this nodepack, recursively.
     * Runs Node.getStructures() on that path, and hosting editor contents if applicable.
     * Throws when run from a worker.
     * @param {String} nodePath Path to the directory containting the nodes.
     * If the directory does not exist, it will be created.
     * @returns {Promise.<Object>}
     * @private
     */
    async initNodes() {
      if (XIBLE.child) {
        throw new Error('Cannot call Node.initFromPath() from worker');
      }

      if (!XIBLE.child && !express) {
        express = require('express');
      }

      const structures = await this.getNodeStructures();

      // Store the typedefs.
      for (const typeDefName in structures.typedefs) {
        structures.typedefs[typeDefName].name = typeDefName;
        XIBLE.TypeDef.add(structures.typedefs[typeDefName]);
      }

      /* Store the nodes.
       * The nodes are not constructed, only the plain object is stored here.
       * FlowInstances will construct the necessary nodes when that flowInstance is started.
       * Editor details are hosted here.
       */
      for (const nodeName in structures.nodes) {
        const structure = structures.nodes[nodeName];

        // Create default typeDefs for unknown input types.
        if (structure.inputs) {
          for (const inputName in structure.inputs) {
            const input = structure.inputs[inputName];
            if (typeof input.type === 'string' && input.type !== 'trigger' && !XIBLE.TypeDef.getByName(input.type)) {
              // nodeDebug(`creating default typedef for "${input.type}"`);
              structures.typedefs[input.type] = { name: input.type };
              XIBLE.TypeDef.add(structures.typedefs[input.type]);
              break;
            }
          }
        }

        // Create default typeDefs for unknown output types.
        if (structure.outputs) {
          for (const outputName in structure.outputs) {
            const output = structure.outputs[outputName];
            if (typeof output.type === 'string' && output.type !== 'trigger' && !XIBLE.TypeDef.getByName(output.type)) {
              // nodeDebug(`creating default typedef for "${output.type}"`);
              structures.typedefs[output.type] = { name: output.type };
              XIBLE.TypeDef.add(structures.typedefs[output.type]);
              break;
            }
          }
        }

        // Host editor contents if applicable
        if (structure.editorContentPath) {
          structure.hostsEditorContent = true;

          EXPRESS_APP.use(`/api/nodes/${nodeName}/editor`, express.static(structure.editorContentPath, {
            index: false
          }));
        }

        this.nodes.push(structure);
        XIBLE.addNode(structure);
      }
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
