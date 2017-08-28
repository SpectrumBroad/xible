'use strict';

const EventEmitter = require('events').EventEmitter;
const debug = require('debug');
const fs = require('fs');
const path = require('path');

// lazy requires
let express;

const nodeDebug = debug('xible:node');

module.exports = (XIBLE, EXPRESS_APP) => {
  /**
  * Trigger event which is applied to event nodes when the flow starts,
  * after all nodes have received the init event.
  * It is also applied to a node when it gets triggered through
  * an input trigger after a call from nodeOutput.trigger().
  * @event Node#trigger
  * @param {FlowState} state A blank state, equal to the state provided on the init event.
  */

  /**
  * Init event which is applied to all nodes, when the flow starts.
  * @event Node#init
  * @param {FlowState} state The initial (blank) state of the flow.
  */

  /**
  * Node class
  * @extends EventEmitter
  */
  class Node extends EventEmitter {
    constructor(obj) {
      super();

      this.name = obj.name;
      this.type = obj.type;
      this.description = obj.description;
      this.nodeExists = true;
      this.hostsEditorContent = obj.hostsEditorContent;
      this.top = obj.top || 0;
      this.left = obj.left || 0;
      this.data = obj.data || {};
      this.flow = null;
      this._id = obj._id;

      this._states = {};

      // init inputs
      this.inputs = {};
      if (obj.inputs) {
        for (const name in obj.inputs) {
          this.addInput(name, obj.inputs[name]);
        }
      }

      // init outputs
      this.outputs = {};
      if (obj.outputs) {
        for (const name in obj.outputs) {
          this.addOutput(name, obj.outputs[name]);
        }
      }

      // vault
      if (this._id) {
        this.vault = new NodeVault(this);
      }

      // construct
      if (XIBLE.child && obj.constructorFunction) {
        this.constructorFunction = obj.constructorFunction;
        this.constructorFunction.call(this, this);
      }
    }

    toJSON() {
      const ignore = ['domain', '_events', '_eventsCount', '_maxListeners', 'flow', '_states', 'vault'];
      const jsonObj = {};
      const objectKeys = Object.keys(this);
      for (let i = 0; i < objectKeys.length; i += 1) {
        const key = objectKeys[i];
        if (ignore.indexOf(key) > -1) {
          continue;
        }
        jsonObj[key] = this[key];
      }
      return jsonObj;
    }

    static getFiles(structuresPath) {
      try {
        return fs.readdirSync(structuresPath);
      } catch (err) {
        nodeDebug(`could not readdir "${structuresPath}": ${err}`);
        return [];
      }
    }

    static getStructures(structuresPath) {
      return new Promise((resolve) => {
        const files = this.getFiles(structuresPath);
        const structures = {
          nodes: {},
          typedefs: {}
        };
        let loadedCounter = 0;

        if (!files.length) {
          resolve(structures);
        }

        function checkAndResolve() {
          if (++loadedCounter === files.length) {
            resolve(structures);
          }
        }

        for (let i = 0; i < files.length; i += 1) {
          if (files[i] === 'node_modules' || files[i].substring(0, 1) === '.') {
            checkAndResolve();
            continue;
          }

          const normalizedPath = path.resolve(structuresPath, files[i]);
          fs.stat(normalizedPath, (err, stat) => {
            if (err) {
              nodeDebug(`Could not stat "${normalizedPath}": ${err}`);
              checkAndResolve();
              return;
            }

            if (!stat.isDirectory()) {
              checkAndResolve();
              return;
            }

            this.getStructure(normalizedPath)
            .then((structure) => {
              if (structure.node) {
                structures.nodes[structure.node.name] = structure.node;
              }
              if (structure.typedefs) {
                Object.assign(structures.typedefs, structure.typedefs);
              }
              checkAndResolve();
            }).catch((getStructureErr) => {
              // process subdirs instead
              this.getStructures(normalizedPath)
              .then((nestedStructures) => {
                if (!Object.keys(nestedStructures).length) {
                  nodeDebug(getStructureErr);
                  checkAndResolve();
                  return;
                }

                Object.assign(structures.nodes, nestedStructures.nodes);
                Object.assign(structures.typedefs, nestedStructures.typedefs);
                checkAndResolve();
              });
            });
          });
        }
      });
    }

    /**
    * Tries to fetch the structure.json from a directory.
    * Also checks for editor contents and typedef.json.
    * @param {String} dirPath Path to the directory containting the structure.json.
    * @returns {Promise.<Object>} Promise which resolves after the structure is complete,
    * or cannot be found.
    * @private
    */
    static getStructure(dirPath) {
      return new Promise((resolve, reject) => {
        let structure = null;
        const typedefs = {};
        const structurePath = `${dirPath}/structure.json`;
        const typedefPath = `${dirPath}/typedef.json`;

        // check for structure.json
        fs.access(structurePath, fs.constants.R_OK, (err) => {
          if (err) {
            reject(`Could not access "${structurePath}": ${err}`);
            return;
          }

          try {
            structure = require(structurePath);
            structure.path = dirPath;
          } catch (requireStructureJsonErr) {
            reject(`Could not require "${structurePath}": ${requireStructureJsonErr}`);
            return;
          }

          // check for typedef.json
          fs.access(typedefPath, fs.constants.R_OK, (typeDefAccessErr) => {
            if (!typeDefAccessErr) {
              try {
                Object.assign(typedefs, require(typedefPath));
              } catch (requireTypedefJsonError) {
                reject(`Could not require "${typedefPath}": ${requireTypedefJsonError}`);
              }
            }

            // check for editor contents
            fs.stat(`${dirPath}/editor`, (statEditorErr, stat) => {
              if (statEditorErr) {
                resolve({
                  node: structure,
                  typedefs
                });
                return;
              }

              if (stat.isDirectory()) {
                structure.editorContentPath = `${dirPath}/editor`;
              }

              resolve({
                node: structure,
                typedefs
              });
            });
          });
        });
      });
    }

    /**
    * Initializes all nodes and typedefs found in a certain path, recursively,
    * by running getStructures() on that path, and hosting editor contents if applicable.
    * @param {String} nodePath Path to the directory containting the nodes.
    * If the directory does not exist, it will be created.
    * @returns {Promise.<Object>}
    * @private
    */
    static initFromPath(nodePath) {
      nodeDebug(`init nodes from "${nodePath}"`);

      // check that nodePath exists
      if (!fs.existsSync(nodePath)) {
        nodeDebug(`creating "${nodePath}"`);

        try {
          fs.mkdirSync(nodePath);
        } catch (err) {
          nodeDebug(`creation of "${nodePath}" failed: `, err);
        }
        return Promise.resolve({});
      }

      if (!XIBLE.child && !express) {
        express = require('express');
      }

      return this.getStructures(nodePath)
      .then((structures) => {
        // store the nodes
        for (const nodeName in structures.nodes) {
          const structure = structures.nodes[nodeName];
          XIBLE.addNode(structure);

          // host editor contents if applicable
          if (structure.editorContentPath && !XIBLE.child) {
            structure.hostsEditorContent = true;

            nodeDebug(`hosting "/api/nodes/${nodeName}/editor"`);
            EXPRESS_APP.use(`/api/nodes/${nodeName}/editor`, express.static(structure.editorContentPath, {
              index: false
            }));
          }
        }

        // store the typedefs
        for (const typeDefName in structures.typedefs) {
          structures.typedefs[typeDefName].name = typeDefName;
          XIBLE.TypeDef.add(structures.typedefs[typeDefName]);
        }
        return structures;
      });
    }

    /**
    * Adds a {NodeInput} to the node.
    * @private
    * @param {String} name Name of the input.
    * @param {NodeInput} input Input to add.
    * @returns {NodeInput} Added input, which equals the given input.
    */
    addInput(name, input) {
      if (!(input instanceof NodeInput)) {
        input = new NodeInput(input);
      }

      input.name = name;
      input.node = this;
      this.inputs[name] = input;

      return input;
    }

    /**
    * Adds a {NodeOutput} to the node.
    * @private
    * @param {String} name Name of the output.
    * @param {NodeOutput} output Output to add.
    * @returns {NodeOutput} Added output, which equals the given output.
    */
    addOutput(name, output) {
      if (!(output instanceof NodeOutput)) {
        output = new NodeOutput(output);
      }

      output.name = name;
      output.node = this;
      this.outputs[name] = output;

      return output;
    }

    /**
    * Returns all inputs attached to this node.
    * @returns {NodeInput[]} List of inputs.
    */
    getInputs() {
      const inputs = [];
      for (const name in this.inputs) {
        inputs.push(this.inputs[name]);
      }
      return inputs;
    }

    /**
    * Returns all outputs attached to this node.
    * @returns {NodeOutput[]} List of outputs.
    */
    getOutputs() {
      const outputs = [];
      for (const name in this.outputs) {
        outputs.push(this.outputs[name]);
      }
      return outputs;
    }

    /**
    * Returns an input by the given name, or null if it does not exist.
    * @param {String} name Name of the input.
    * @returns {NodeInput|null} An input, or null if not found.
    */
    getInputByName(name) {
      return this.inputs[name];
    }

    /**
    * Returns an output by the given name, or null if it does not exist.
    * @param {String} name Name of the output.
    * @returns {NodeOutput|null} An output, or null if not found.
    */
    getOutputByName(name) {
      return this.outputs[name];
    }

    /**
    * Adds a progress bar to the node, visible in the editor.
    * @param {Object} status
    * @param {String} [status.message] A text message representing the context of the progress bar.
    * @param {Number} [status.percentage=0] The starting point of the progress bar as a percentage.
    * Value can range from 0 to (including) 100.
    * @param {Number} [status.updateOverTime] Specifies the time in milliseconds
    * to automatically update the progress bar to 100% from the given percentage value.
    * @param {Number} [status.timeout] Timeout in milliseconds
    * after which the progress bar disappears.
    * @returns {Number} Returns an identifier,
    * which can be used to update the status of the progress bar through node.updateProgressBarById,
    * or remove the progress bar through removeProgressBarById.
    */
    addProgressBar(status) {
      if (!status) {
        throw new Error('the "status" argument is required');
      }

      status._id = XIBLE.generateObjectId();

      if (!status.startDate) {
        status.startDate = Date.now();
      }

      this.sendProcessMessage({
        method: 'broadcastWebSocket',
        message: {
          method: 'xible.node.addProgressBar',
          status
        }

      });

      return status._id;
    }

    /**
    * Sends a message to the master process from a worker using Node.js process.send().
    * Hooks up node.id and node.flow.id to the message property of the given obj parameter.
    * @param {Object} obj The object to send.
    * @param {String} obj.method The method of this message to call in the master process.
    * @param {Object} obj.message The message to send.
    * @private
    */
    sendProcessMessage(obj) {
      if (process.connected) {
        if (obj.message) {
          obj.message.nodeId = this._id;
          if (this.flow) {
            obj.message.flowId = this.flow._id;
          }
        }
        process.send(obj);
      }
    }

    /**
    * Updates the status on an existing progress bar.
    * @param {Number} statusId The identifier of the existing progress bar,
    * as returned by addProgressBar().
    * @param {Object} status
    * @param {Number} status.percentage The point of the progress bar as a percentage.
    * Value can range from 0 to (including) 100.
    * @returns {Number} Returns the given statusId.
    */
    updateProgressBarById(statusId, status) {
      if (!statusId || !status) {
        throw new Error('the "statusId" and "status" arguments are required');
      }

      this.sendProcessMessage({
        method: 'broadcastWebSocket',
        message: {
          method: 'xible.node.updateProgressBarById',
          status: {
            _id: statusId,
            percentage: status.percentage
          }
        }
      });

      return statusId;
    }

    /**
    * Updates the status on an existing status.
    * @param {Number} statusId The identifier of the existing status, as returned by addStatus().
    * @param {Object} status
    * @param {String} status.message Text message to show.
    * @param {String} [status.color] Color for the indicator next to the text message.
    * If none provided, the CSS file of the editor decides on a appropriate default color.
    * @returns {Number} Returns the given statusId.
    */
    updateStatusById(statusId, status) {
      if (!statusId || !status) {
        throw new Error('the "statusId" and "status" arguments are required');
      }

      this.sendProcessMessage({
        method: 'broadcastWebSocket',
        message: {
          method: 'xible.node.updateStatusById',
          status: {
            _id: statusId,
            message: status.message,
            color: status.color
          }
        }
      });

      return statusId;
    }

    /**
    * Adds a status message to a node, visible in the editor.
    * @param {Object} status
    * @param {String} status.message Text message to show.
    * @param {String} [status.color] Color for the indicator next to the text message.
    * If none provided, the CSS file of the editor decides on a appropriate default color.
    * @returns {Number} Returns an identifier,
    * which can be used to update the status through node.updateStatusById,
    * or remove it through removeStatusById.
    */
    addStatus(status) {
      if (!status) {
        throw new Error('the "status" argument is required');
      }

      status._id = XIBLE.generateObjectId();

      this.sendProcessMessage({
        method: 'broadcastWebSocket',
        message: {
          method: 'xible.node.addStatus',
          status
        }
      });

      return status._id;
    }

    /**
    * Removes a progress bar referred to by it sidentifier.
    * @param {Number} statusId Identifier of the progress bar to remove.
    * @param {Number} [timeout]
    * The amount of time in milliseconds before actually removing the progress bar.
    */
    removeProgressBarById(statusId, timeout) {
      this.removeStatusById(statusId, timeout);
    }

    /**
    * Removes a status referred to by it sidentifier.
    * @param {Number} statusId Identifier of the status to remove.
    * @param {Number} [timeout]
    * The amount of time in milliseconds before actually removing the status.
    */
    removeStatusById(statusId, timeout) {
      if (!statusId) {
        throw new Error('the "statusId" argument is required');
      }

      this.sendProcessMessage({
        method: 'broadcastWebSocket',
        message: {
          method: 'xible.node.removeStatusById',
          status: {
            _id: statusId,
            timeout
          }
        }
      });
    }

    /**
    * Removes all statuses and progress bars for a node, immediately.
    */
    removeAllStatuses() {
      this.sendProcessMessage({
        method: 'broadcastWebSocket',
        message: {
          method: 'xible.node.removeAllStatuses'
        }
      });
    }

    /**
    * Overwrites the tracker message.
    * This message is visible above a node in the editor,
    * and usually used to show when the node got triggered.
    * @param {Object} status
    * @param {String} status.message Text message to show.
    * @param {String} [status.color] Color for the indicator next to the text message.
    * If none provided, the CSS file of the editor decides on a appropriate default color.
    */
    setTracker(status) {
      if (!status) {
        throw new Error('the "status" argument is required');
      }

      this.sendProcessMessage({
        method: 'broadcastWebSocket',
        message: {
          method: 'xible.node.setTracker',
          status
        }
      });
    }

    /**
    * Triggers this.error(), but only allows a string argument as error.
    * @param {String} err The error message.
    * @param {FlowState} state Flowstate at point of the failure.
    * @deprecated Deprecated since version 0.3.0.
    * @private
    */
    fail(err, state) {
      console.warn('Node.fail() is deprecated. Use Node.error() instead');

      if (typeof err !== 'string') {
        throw new Error('"err" argument of Node.error(state, err) must be of type "string"');
      }

      this.error(err, state);
    }

    /**
    * Raises an error on the node, bubbled to the flow.
    * Calls setTracker() on the node with the error message.
    * If the flow contains an "error" event listener, the flow will not stop.
    * This behaviour is demonstrated by including a "xible.node.onerror" node in the flow.
    * Note that throwing an error using "throw" will always stop the flow.
    * Raising an error in a node should not trigger any outputs.
    * @param {Error} err An error object to raise.
    * @param {FlowState} err.state Flowstate at point of the error.
    * Either this or the state argument should be provided.
    * @param {FlowState} state Flowstate at point of the error.
    * Either this or the err.state argument should be provided.
    */
    error(err, state) {
      if (!(state instanceof XIBLE.FlowState) && !(err.state instanceof XIBLE.FlowState)) {
        throw new Error('state should be provided and instance of FlowState');
      }

      if (!(err instanceof Error)) {
        err = new Error(`${err}`);
      }

      if (state) {
        err.state = state;
      }
      err.node = this;

      this.setTracker({
        message: err.message,
        color: 'red',
        timeout: 7000
      });

      if (this.flow) {
        this.flow.emit('error', err);
      }
    }

    /**
    * Confirms whether the node has any inputs of the given type.
    * @param {String|null} type The type you want to check. Null would be "any" type.
    * @returns {Boolean} Returns a Boolean; true or false.
    */
    hasConnectedInputsOfType(type) {
      return this.inputs.some(input => input.type === type && input.connectors.length);
    }

    /**
    * Asserts that the given status is a FlowState
    * @param {FlowState} state
    * @returns {Boolean} Always returns true if not thrown.
    */
    static flowStateCheck(state) {
      if (!(state instanceof XIBLE.FlowState)) {
        throw new Error('state should be provided and instance of FlowState');
      }

      return true;
    }
  }

  /**
  * Abstract Node Input/Output class.
  * @extends EventEmitter
  */
  class NodeIo extends EventEmitter {
    constructor(obj) {
      super();

      this.name = null;
      this.type = null;
      this.singleType = false;
      this.assignsOutputType = null;
      this.assignsInputType = null;
      this.maxConnectors = null;
      this.node = null;
      this.description = null;

      if (obj) {
        if (typeof obj.type === 'string') {
          if (obj.type === 'global') {
            throw new TypeError('you cannot define a input or output with type \'global\'');
          }

          this.type = obj.type;
        }

        if (typeof obj.singleType === 'boolean') {
          this.singleType = obj.singleType;
        }

        if (typeof obj.assignsOutputType === 'string') {
          this.assignsOutputType = obj.assignsOutputType;
        }

        if (typeof obj.assignsInputType === 'string') {
          this.assignsInputType = obj.assignsInputType;
        }

        if (typeof obj.maxConnectors === 'number') {
          this.maxConnectors = obj.maxConnectors;
        }

        if (typeof obj.global === 'boolean') {
          this.global = obj.global;
        }

        if (typeof obj.description === 'string') {
          this.description = obj.description;
        }
      }

      this.connectors = [];
    }

    toJSON() {
      const ignore = ['domain', '_events', '_eventsCount', '_maxListeners', 'node', 'connectors'];
      const jsonObj = {};
      const objectKeys = Object.keys(this);
      for (let i = 0; i < objectKeys.length; i += 1) {
        const key = objectKeys[i];
        if (ignore.indexOf(key) > -1) {
          continue;
        }
        jsonObj[key] = this[key];
      }
      return jsonObj;
    }

    /**
    * Confirms whether or not the NodeIo is connected. Also checks for global connections.
    * @returns {Boolean} True if connected, false if not.
    */
    isConnected() {
      let conns = this.connectors;

      // check global outputs
      if (!conns.length && this.global && this.node && this.node.flow) {
        conns = this.node.flow.getGlobalOutputsByType(this.type);
      }

      if (conns.length) {
        return true;
      }

      return false;
    }
  }

  /**
  * This event is emitted after a node calls trigger() on one of its outputs.
  * The event is fired for each of the input triggers connected to the output
  * where trigger() was called upon.
  * @event NodeInput#trigger
  * @param {Connector} conn The connector responsible for the trigger.
  * @param {FlowState} state The state provided from the calling node.
  */

  /**
  * Class for inputs of a Node.
  * @extends NodeIo
  */
  class NodeInput extends NodeIo {
    /**
    * Fetches all input values for this input.
    * @param {FlowState} state The flowstate at the time of calling.
    * @fires NodeOutput#trigger
    * @returns {Promise.<Array>} An array of all values
    * as returned by the outputs on the other ends of connected connectors or globals.
    * If any of the outputs returns an array,
    * it will be concatened to the return array, instead of pushed.
    */
    getValues(state) {
      Node.flowStateCheck(state);

      return new Promise((resolve) => {
        let conns = this.connectors;

        // add global outputs as a dummy connector to the connector list
        if (!conns.length && this.global) {
          conns = this.node.flow
          .getGlobalOutputsByType(this.type)
          .map(output => ({
            origin: output
          }));
        }

        const connLength = conns.length;
        if (!connLength) {
          resolve([]);
          return;
        }

        let values = [];
        let callbacksReceived = 0;
        for (let i = 0; i < connLength; i += 1) {
          const conn = conns[i];
          let calledBack = false;

          conn.origin.emit('trigger', conn, state, (value) => { // eslint-disable-line
            // verify that this callback wasn't already made.
            if (calledBack) {
              throw new Error('Already called back');
            }
            calledBack = true;

            // we only send arrays between nodes
            // we don't add non existant values
            // we concat everything
            if (value !== undefined) {
              if (Array.isArray(value)) {
                values = values.concat(value);
              } else {
                values.push(value);
              }
            }

            // all done
            if (++callbacksReceived === connLength) {
              resolve(values);
            }
          });
        }
      });
    }
  }

  /**
  * This event is emitted after a node calls getValues() on one of its inputs.
  * The event is fired for each of the outputs connected to the input
  * where getValues() was called upon.
  * @event NodeOutput#trigger
  * @param {Connector} conn The connector responsible for the trigger.
  * @param {FlowState} state The state provided from the calling node.
  * @param {Function} callback Use the callback function to return your value.
  * You can only callback once, otherwise an Error is thrown.
  */

  /**
  * Class for outputs of a Node.
  * @extends NodeIo
  */
  class NodeOutput extends NodeIo {
    /**
    * Triggers an output with type === 'trigger'
    * @param {FlowState} state The flowstate at the time of calling.
    * @fires NodeInput#trigger
    * @throws {Error} Throws whenever this.type !== 'trigger'.
    */
    trigger(state) {
      if (this.type !== 'trigger') {
        throw new Error('The output must be of type "trigger".');
      }
      Node.flowStateCheck(state);

      // this.node.emit('triggerout', this);

      const conns = this.connectors;
      for (let i = 0; i < conns.length; i += 1) {
        const conn = conns[i];
        conn.destination.node.emit('trigger');
        conn.destination.emit('trigger', conn, state.split());
      }
    }
  }

  if (EXPRESS_APP) {
    require('./routes.js')(Node, XIBLE, EXPRESS_APP);
  }

  // TODO: encryption on the vault
  const vaultDebug = debug('xible:vault');
  let vault;
  let vaultPath = XIBLE.Config.getValue('vault.path');
  if (!vaultPath) {
    throw new Error('no "vault.path" configured');
  }
  vaultPath = XIBLE.resolvePath(vaultPath);

  class MainVault {
    static init() {
      // create the vault if it doesn't exist
      if (!fs.existsSync(vaultPath)) {
        vaultDebug('creating new');
        fs.writeFileSync(vaultPath, '{}', {
          mode: 0o600
        });
      }

      try {
        vault = JSON.parse(fs.readFileSync(vaultPath));
      } catch (err) {
        vaultDebug(`could not open "${vaultPath}"\n`, err);
      }
    }

    static save() {
      try {
        fs.writeFileSync(vaultPath, JSON.stringify(vault), {
          mode: 0o600
        });
      } catch (err) {
        vaultDebug(`could not save "${vaultPath}"\n`, err);
      }
    }

    static get(node) {
      if (!node || !node._id) {
        return null;
      }

      if (!vault) {
        this.init();
      }

      return vault[node._id];
    }

    static set(node, obj) {
      if (!node || !node._id) {
        return;
      }

      // always get fresh contents
      this.init();

      vault[node._id] = obj;
      this.save();
    }
  }

  class NodeVault {
    constructor(node) {
      this.node = node;
    }

    set(obj) {
      // also update the data property on the node
      Object.assign(this.node.data, obj);
      return MainVault.set(this.node, obj);
    }

    get() {
      return MainVault.get(this.node);
    }
  }

  return {
    Node,
    NodeInput,
    NodeOutput
  };
};
