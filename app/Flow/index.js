'use strict';

const { EventEmitter } = require('events');
const debug = require('debug');

// lazy requires
let sanitizePath;
let express;

const flowDebug = debug('xible:flow');

/**
 * Does a very simple html encode of the input string.
 * Only replaces double quote, greater than and less than.
 * @param {String} str The String to html encode.
 * @returns {String}
 */
function baseHtmlEncode(str) {
  return str.replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

module.exports = (XIBLE, EXPRESS_APP) => {
  // global output caching
  let globalOutputs = null; // caching

  // default init level for flows
  const initLevel = XIBLE.Config.getValue('flows.initlevel');

  if (!XIBLE.child && !express) {
    express = require('express');
  }

  /**
  * Flow class
  */
  class Flow extends EventEmitter {
    constructor() {
      super();

      this._id = null;
      this.name = null;
      this.json = null;
      this.nodes = [];
      this.connectors = [];
      this.initLevel = initLevel;
      this.instances = [];
      this.emptyInitInstance = null;
      this._deleted = false;
    }

    static get INITLEVEL_NONE() {
      return 0;
    }

    static get INITLEVEL_FLOW() {
      return 1;
    }

    static get INITLEVEL_NODES() {
      return 2;
    }

    /**
    * Init flows from a given path.
    * This will parse all json files except for _status.json into flows.
    * Note that a path cannot be initiated twice because it is used for saveStatuses()
    * @param {Boolean} cleanVault Indicates whether the json data from each flow
    * needs vault sanitizing.
    * @return {Promise<Object<String, Flow>>} List of flows by their _id.
    */
    static async getFlows(cleanVault) {
      flowDebug('init flows');

      const flowJsons = await XIBLE.activeFlowStore.getFlowJsons();

      // will hold the flows by their _id
      const flows = {};
      await Promise.all(flowJsons.map(async (flowJson) => {
        try {
          const flow = new Flow();
          await flow.initJson(flowJson, cleanVault);
          flows[flow._id] = flow;
        } catch (err) {
          flowDebug(`could not init flow: ${err.stack}`);
        }
      }));

      return flows;
    }

    /**
     * Init a single flow by its given name.
     * @param {String} flowName The name of the flow.
     * @param {Boolean} cleanVault Indicates whether the json data from each flow.
     * needs vault sanitizing.
     * @returns {Promise<Flow>} A single Flow object.
     * @since 0.16.0
     */
    static async getOneFlow(flowName, cleanVault) {
      const flowJson = await XIBLE.activeFlowStore.getFlowJson(flowName);

      const flow = new Flow();
      await flow.initJson(flowJson, cleanVault);

      return flow;
    }

    /**
    * Initializes all flows from a given path, by running them through initFromPath().
    * Processes the related flow statuses and starts/inits where necessary.
    * @returns {Promise<Object<String, Flow>>} List of flows by their _id.
    * @since 0.5.0
    */
    static async init() {
      const flows = await this.getFlows();

      // start all flows which had status running before
      const statuses = await XIBLE.activeFlowStore.getFlowInstanceStatuses();
      const preStatusesLength = Object.keys(statuses).length;
      for (const flowId in statuses) {
        // ignore flows that don't exist anymore
        if (
          !flows[flowId]
          || !Array.isArray(statuses[flowId])
        ) {
          delete statuses[flowId];
          continue;
        }

        statuses[flowId].forEach(async (instanceStatus) => {
          if (instanceStatus.state !== XIBLE.FlowInstance.STATE_STARTED) {
            return;
          }

          try {
            const instance = flows[flowId].createInstance({ params: instanceStatus.params });
            instance._id = instanceStatus._id;
            await instance.forceStart();
          } catch (err) {
            flowDebug(`failed to start "${flowId}": ${err}`);
          }
        });
      }

      flowDebug(`cleared ${preStatusesLength - Object.keys(statuses).length} statuses`);

      return flows;
    }

    /**
    * Validates if writing to the flow path is possible/allowed
    * @returns {Promise<Boolean>} true or false
    */
    static validatePermissions() {
      return XIBLE.activeFlowStore.validateFlowPermissions();
    }

    /**
    * Validates that the _id/name of a flow does not contain illegal characters.
    * @param {String} _id The _id/name of the flow to be validated.
    * @returns {Boolean} Returns a boolean indicating whether the given _id is allowed (true),
    * or not (false).
    * @since 0.5.0
    */
    static validateId(_id) {
      if (!sanitizePath) {
        sanitizePath = require('sanitize-filename');
      }
      return _id === sanitizePath(_id);
    }

    /**
    * Init a flow, including all its nodes and connectors, from an object.
    * @param {Object} json
    * @param {String} json._id
    * @param {Array} json.nodes
    * @param {Array} json.connectors
    * @param {Boolean} cleanVault Indicates whether the json data needs vault sanitizing.
    */
    async initJson(json, cleanVault) {
      flowDebug(`initJson on "${json._id}"`);

      if (!json || !json._id) {
        throw new Error('object containing _id as argument is required');
      }

      // only perform this filename check in master for performance reasons
      if (!XIBLE.child) {
        if (!Flow.validateId(json._id)) {
          const err = new Error('flow _id/name cannot contain reserved/unsave characters');
          err.code = 'ERR_FLOW_NAMING';
          throw err;
        }
      }

      this._id = json._id;
      this.name = this._id;
      json.name = this.name;

      this.json = json;
      this.nodes = [];
      this.connectors = [];
      this.runnable = true;

      // get the nodes
      for (let i = 0; i < json.nodes.length; i += 1) {
        const node = json.nodes[i];
        const nodeConstr = XIBLE.getNodeByName(node.name);
        let xibleNode;

        // init a dummy node directly based on the json
        // and ensure the flow is set to not runnable
        if (!nodeConstr) {
          flowDebug(`Node "${node.name}" does not exist`);

          xibleNode = new XIBLE.Node(node);
          xibleNode.nodeExists = false;
          xibleNode.data = node.data;
          this.runnable = false;
        } else {
          // init a working node
          xibleNode = new XIBLE.Node({
            ...nodeConstr,
            _id: node._id,
            data: { ...node.data },
            left: node.left,
            top: node.top
          });

          if (!xibleNode) {
            throw new Error(`Could not construct node '${node.name}'`);
          }

          // check for data keys that should be vaulted
          // remove those from the json (the json is used for saving)
          // save the vault data thereafter
          if (cleanVault) {
            const nodeVaultKeys = nodeConstr.vault;
            const nodeVaultData = {};
            if (nodeVaultKeys && Array.isArray(nodeVaultKeys)) {
              for (const dataKey in node.data) {
                if (nodeVaultKeys.includes(dataKey)) {
                  nodeVaultData[dataKey] = node.data[dataKey];
                  delete node.data[dataKey];
                }
              }
            }

            if (Object.keys(nodeVaultData).length) {
              await xibleNode.vault.set(
                Object.assign(await xibleNode.vault.get() || {}, nodeVaultData)
              );
            }
          } else if (xibleNode.vault) {
            Object.assign(xibleNode.data, await xibleNode.vault.get());
          }

          // host routes
          if (!XIBLE.child && nodeConstr.routePaths.flow) {
            try {
              const router = express.Router();
              EXPRESS_APP.use(`/api/nodes/${xibleNode.name}/routes/flow/${xibleNode._id}/`, router);
              require(nodeConstr.routePaths.flow)(xibleNode, router, express.static);
            } catch (err) {
              console.error(err);
            }
          }
        }

        this.addNode(xibleNode);

        for (const name in node.inputs) {
          const nodeInput = node.inputs[name];
          let xibleNodeInput = xibleNode.inputs[name];
          if (!xibleNodeInput) {
            flowDebug(`Node "${node.name}" does not have input "${name}"`);

            xibleNodeInput = xibleNode.addInput(name, nodeInput);
            xibleNode.nodeExists = false;
            this.runnable = false;
          }

          xibleNodeInput._id = nodeInput._id;
          xibleNodeInput.global = nodeInput.global;
          xibleNodeInput.type = nodeInput.type;
        }

        for (const name in node.outputs) {
          const nodeOutput = node.outputs[name];
          let xibleNodeOutput = xibleNode.outputs[name];
          if (!xibleNodeOutput) {
            flowDebug(`Node "${node.name}" does not have output "${name}"`);

            xibleNodeOutput = xibleNode.addOutput(name, nodeOutput);
            xibleNode.nodeExists = false;
            this.runnable = false;
          }

          xibleNodeOutput._id = nodeOutput._id;
          xibleNodeOutput.global = nodeOutput.global || false;
          xibleNodeOutput.type = nodeOutput.type;
        }

        // construct a dummy editorContents
        if (!xibleNode.nodeExists) {
          xibleNode.editorContent = '';
          for (const key in xibleNode.data) {
            xibleNode.editorContent += `<input type="text" placeholder="${baseHtmlEncode(key)}" data-outputvalue="${baseHtmlEncode(key)}" required="required" />`;
          }
        }
      }

      // get the connectors
      for (let i = 0; i < json.connectors.length; i += 1) {
        const origin = this.getOutputById(json.connectors[i].origin);
        if (!origin) {
          flowDebug(`Cannot find output by id "${json.connectors[i].origin}"`);
          this.runnable = false;
          continue;
        }

        const destination = this.getInputById(json.connectors[i].destination);
        if (!destination) {
          flowDebug(`Cannot find input by id "${json.connectors[i].destination}"`);
          this.runnable = false;
          continue;
        }

        const xibleConnector = {
          origin,
          destination
        };

        origin.connectors.push(xibleConnector);
        destination.connectors.push(xibleConnector);
      }

      XIBLE.addFlow(this);

      this.emit('initJson');

      if (!XIBLE.child && this.initLevel === Flow.INITLEVEL_FLOW) {
        if (this.emptyInitInstance) {
          this.emptyInitInstance.delete();
        } else {
          this.createEmptyInitInstance();
        }
      }
    }

    /**
    * Saves a flow to the configured flows directory.
    * Rejects if this is not the master thread.
    * @return {Promise<Flow>}
    */
    async save() {
      if (XIBLE.child || !this._id) {
        throw new Error('not master or no flow._id');
      }

      await XIBLE.activeFlowStore.saveFlow(this);
      this.emit('save');

      return this;
    }

    /**
    * Deletes a flow from the configured flows directory.
    * Stops all instances first.
    * Rejects if this is not the master thread.
    * @return {Promise<Flow>}
    */
    async delete() {
      if (XIBLE.child || !this._id) {
        throw new Error('not master or no flow._id');
      }

      this._deleted = true;

      // stop all instances
      await this.deleteAllInstances();
      this.instances = [];

      flowDebug(`deleting "${this._id}"`);

      await XIBLE.activeFlowStore.deleteFlow(this);

      // remove from Xible instance
      if (XIBLE) {
        delete XIBLE.flows[this._id];
      }

      this.emit('delete');
    }

    /**
    * Adds a node to the flow.
    * @param {Node} node The node to add.
    * @return {Node}
    */
    addNode(node) {
      node.flow = this;

      // track direct triggers of nodes
      node.prependListener('triggerStartTime', (type) => {
        const d = new Date();
        // node._trackerTriggerTime = d.getTime();

        node.setTracker({
          message: `${type === 'output' ? 'hit' : 'start'} @ ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}:${d.getMilliseconds()}`,
          timeout: 3000
        });
      });

      // add and return
      this.nodes.push(node);
      return node;
    }

    /**
    * Returns a node from a specific flow by the node._id.
    * @param {Number} id The _id of the node to be found.
    * @return {Node|undefined} The found node.
    */
    getNodeById(id) {
      return this.nodes.find((node) => node._id === id);
    }

    /**
    * Returns an input for any node by the input._id.
    * @param {Number} id the _id of the nodeInput to be found.
    * @return {NodeInput|null} The found nodeInput, or null if none.
    */
    getInputById(id) {
      for (let i = 0; i < this.nodes.length; i += 1) {
        const node = this.nodes[i];
        for (const name in node.inputs) {
          if (node.inputs[name]._id === id) {
            return node.inputs[name];
          }
        }
      }
      return null;
    }

    /**
    * Returns an output for any node by the output._id.
    * @param {Number} id the _id of the nodeOutput to be found.
    * @return {NodeOutput|null} The found nodeOutput, or null if none.
    */
    getOutputById(id) {
      for (let i = 0; i < this.nodes.length; i += 1) {
        const node = this.nodes[i];
        for (const name in node.outputs) {
          if (node.outputs[name]._id === id) {
            return node.outputs[name];
          }
        }
      }
      return null;
    }

    /**
    * Returns all global outputs with a given type.
    * @param {String} type Type of global outputs to be fetched.
    * @return {NodeOutput[]} The global nodeOutputs.
    */
    getGlobalOutputsByType(type) {
      if (globalOutputs) {
        return globalOutputs.filter((globalOutput) => globalOutput.type === type);
      }

      const outputs = [];
      globalOutputs = [];
      for (let i = 0; i < this.nodes.length; i += 1) {
        const node = this.nodes[i];
        for (const name in node.outputs) {
          const output = node.outputs[name];
          if (output.global) {
            globalOutputs.push(output);

            if (output.type === type) {
              outputs.push(output);
            }
          }
        }
      }

      return outputs;
    }

    createEmptyInitInstance() {
      this.emptyInitInstance = this.createInstance();

      const recreate = () => {
        if (this.emptyInitInstance) {
          this.emptyInitInstance.removeEmptyInitInstanceListeners();
          this.emptyInitInstance = null;
        }

        if (this._deleted || XIBLE.stopping) {
          return;
        }
        this.createEmptyInitInstance();
      };

      this.emptyInitInstance.removeEmptyInitInstanceListeners = function removeEmptyInitInstanceListeners() {
        this.removeListener('stopping', recreate);
        this.removeListener('stopped', recreate);
        this.removeListener('delete', recreate);
      };

      this.emptyInitInstance.on('stopping', recreate);
      this.emptyInitInstance.on('stopped', recreate);
      this.emptyInitInstance.on('delete', recreate);

      return this.emptyInitInstance.init();
    }

    /**
     * Creates a new instance of this flow.
     * This instance can be started/stopped etc.
     * @param {Object} options
     * @param {Object} options.params
     * @param {Object} options.directNodes
     * @returns {FlowInstance}
     */
    createInstance({ params, directNodes } = {}) {
      if (!this.runnable) {
        throw new Error(`Flow "${this._id}" is not runnable`);
      }

      if (this.initLevel === Flow.INITLEVEL_FLOW && this.emptyInitInstance) {
        const { emptyInitInstance } = this;
        emptyInitInstance.params = params;
        emptyInitInstance.directNodes = directNodes;
        this.emptyInitInstance.removeEmptyInitInstanceListeners();
        this.emptyInitInstance = null;
        this.createEmptyInitInstance();
        return emptyInitInstance;
      }

      const createStart = process.hrtime();

      const flowInstance = new XIBLE.FlowInstance(this, params, directNodes);
      this.instances.push(flowInstance);

      flowInstance.timing.createDate = Date.now();
      flowInstance.timing.createStart = createStart;
      flowInstance.timing.createEnd = process.hrtime();

      this.emit('createInstance', { flowInstance });
      return flowInstance;
    }

    /**
     * Delete the provided instance for this flow.
     * @param {FlowInstance} instance
     * @returns {Promise}
     */
    async deleteInstance(instance) {
      if (!(instance instanceof XIBLE.FlowInstance)) {
        throw new TypeError('argument "instance" must be instanceof FlowInstance');
      }

      const index = this.instances.indexOf(instance);
      if (index === -1) {
        throw new TypeError('argument "instance" is not instance of this flow');
      }

      this.instances.splice(index, 1);

      if (instance.state !== XIBLE.FlowInstance.STATE_STOPPED) {
        await instance.forceStop(false);
      }

      this.emit('deleteInstance', { flowInstance: instance });
    }

    /**
     * Returns the instance on this flow for the given id.
     * @param {String} id The _id of the FlowInstance to return.
     * @returns {FlowInstance|null}
     */
    getInstanceById(id) {
      return this.instances.find((instance) => instance._id === id);
    }

    /**
     * Stops all instances for this flow.
     * @returns {Promise<Flow>} Returns the current flow for daisy chaining.
     */
    async stopAllInstances() {
      await Promise.all(
        this.instances.map((instance) => {
          if (instance !== this.emptyInitInstance) {
            return instance.forceStop();
          }
          return null;
        })
      );
      return this;
    }

    /**
     * Deletes all instances for this flow.
     * @returns {Promise<Flow>} Returns the current flow for daisy chaining.
     */
    async deleteAllInstances() {
      await Promise.all(this.instances.slice().map((instance) => instance.delete()));
      return this;
    }

    /**
     * Publishes the flow to the registry.
     */
    async publish(altName) {
      if (!XIBLE.Config.getValue('registry.flows.allowpublish')) {
        const err = new Error('Your config does not allow to publish flows to the registry');
        err.code = 'ERR_CONFIG';
        throw err;
      }

      let flowJson = this.json;
      if (altName) {
        if (!Flow.validateId(altName)) {
          const err = new Error('flow _id/name cannot contain reserved/unsave characters');
          err.code = 'ERR_FLOW_NAMING';
          throw err;
        }
        flowJson = { ...this.json };
        flowJson._id = altName;
        flowJson.name = altName;
      }

      // verify that we have a token
      const token = XIBLE.Registry.getUserToken();
      if (!token) {
        const err = new Error('Not logged in.');
        err.code = 'ERR_REGISTRY_NOT_LOGGED_IN';
        throw err;
      }

      // verify that we're logged in
      return XIBLE.Registry.User
        .getByToken(token)
        .catch((getUserErr) => Promise.reject(new Error(`Failed to get user from token: ${getUserErr}`)))
        .then((user) => {
          if (!user) {
            const err = new Error('User could not be verified. Please login using "xiblepm user login".');
            err.code = 'ERR_REGISTRY_NOT_LOGGED_IN';
            return Promise.reject(err);
          }

          // publish
          return XIBLE.Registry.Flow
            .publish(flowJson);
        });
    }

    emit(eventName, obj) {
      super.emit(eventName, obj);

      const broadcastWebSocketObj = {
        method: `xible.flow.${eventName}`,
        flow: this
      };

      if (obj && typeof obj === 'object') {
        Object.assign(broadcastWebSocketObj, obj);
      }

      XIBLE.broadcastWebSocket(broadcastWebSocketObj);
    }

    toJSON() {
      return {
        _id: this._id,
        name: this._id,
        nodes: this.nodes,
        connectors: this.json.connectors,
        viewState: this.json.viewState,
        runnable: this.runnable
      };
    }
  }

  if (EXPRESS_APP) {
    require('./routes.js')(Flow, XIBLE, EXPRESS_APP);
  }

  return {
    Flow
  };
};
