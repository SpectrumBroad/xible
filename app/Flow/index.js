'use strict';

const EventEmitter = require('events').EventEmitter;
const debug = require('debug');
const fs = require('fs');
const path = require('path');

// lazy requires
let sanitizePath;
let fork;

const flowDebug = debug('xible:flow');

module.exports = (XIBLE, EXPRESS_APP) => {
  // global output caching
  let globalOutputs = null; // caching

  // default init level for flows
  const initLevel = XIBLE.Config.getValue('flows.initlevel');

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
      this.usage = null;
      this.runnable = true;
      this.directed = false;
      this.state = Flow.STATE_STOPPED;
      this.initLevel = initLevel;
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
    * @static
    * @param {String} path  The path to the directory containing the flows.
    * @return {Object.<String, Flow>} list of flows by their _id
    */
    static initFromPath(flowPath) {
      flowDebug(`init flows from "${flowPath}"`);
      if (this.flowPath) {
        throw new Error(`cannot init multiple flow paths. "${this.flowPath}" already init`);
      }
      this.flowPath = flowPath;

      // check that flowPath exists
      if (!fs.existsSync(flowPath)) {
        flowDebug(`creating "${flowPath}"`);
        fs.mkdirSync(flowPath);
      }

      // will hold the flows by their _id
      const flows = {};

      // get the files in the flowPath
      let files;
      try {
        files = fs.readdirSync(flowPath);
      } catch (err) {
        flowDebug(`could not readdir "${flowPath}": ${err}`);
        files = [];
      }

      // get the flows and load them
      for (let i = 0; i < files.length; i += 1) {
        const filepath = `${flowPath}/${files[i]}`;

        // only fetch json files but ignore _status.json and hidden files
        if (files[i].substring(0, 1) !== '_' && files[i].substring(0, 1) !== '.' && fs.statSync(filepath).isFile() && path.extname(filepath) === '.json') {
          try {
            const json = JSON.parse(fs.readFileSync(filepath));
            if (json._id) {
              const flow = new Flow(XIBLE);
              flow.initJson(json);
              flows[flow._id] = flow;
            }
          } catch (err) {
            flowDebug(`could not init "${filepath}": ${err.stack}`);
          }
        }
      }

      return flows;
    }

    /**
    * Initializes all flows from a given path, by running them through initFromPath().
    * Processes the related flow statuses and starts/inits where necessary.
    * @param {String} flowPath The path to the directory containing the flows.
    * @return {Object.<String, Flow>} list of flows by their _id
    * @since 0.5.0
    */
    static init(flowPath) {
      const flows = this.initFromPath(flowPath);

      // start all flows which had status running before
      // also do some cleaning while we're at it
      const statuses = this.getStatuses();
      const preStatusesLength = Object.keys(statuses).length;
      for (const flowId in statuses) {
        // if a flow doesn't exist anymore, remove it from the statuses
        if (!flows[flowId]) {
          delete statuses[flowId];
        } else if (statuses[flowId]) {
          flows[flowId].forceStart()
            .catch((err) => {
              flowDebug(`failed to start "${flowId}": ${err}`);
            });
        } else if (flows[flowId].initLevel === Flow.INITLEVEL_FLOW) {
          flows[flowId].init();
        }
      }

      flowDebug(`cleared ${preStatusesLength - Object.keys(statuses).length} statuses`);
      return flows;
    }

    /**
    * Validates if writing to the flow path is possible/allowed
    * @returns {Promise.<Boolean>} true or false
    */
    static validatePermissions() {
      return new Promise((resolve) => {
        if (!this.flowPath) {
          resolve(false);
        }

        // check if we can write
        fs.access(this.flowPath, fs.W_OK, (err) => {
          if (err) {
            resolve(false);
            return;
          }

          resolve(true);
        });
      });
    }

    /**
    * Get all flow statuses.
    * @return {Object.<String, Boolean>} The statuses per flow name.
    */
    static getStatuses() {
      if (!this.flowPath) {
        throw new Error('Cannot get statuses; flows have not been loaded from path');
      }

      if (this._statuses) {
        return this._statuses;
      }

      let statuses = {};

      try {
        statuses = JSON.parse(fs.readFileSync(`${this.flowPath}/_status.json`));
        flowDebug(`found ${Object.keys(statuses).length} statuses`);
      } catch (err) {
        flowDebug(`"${this.flowPath}/_status.json" cannot be opened: ${err}`);
      }

      this._statuses = statuses;

      return statuses;
    }

    /**
    * Save the given statuses to the filesystem.
    * @param {Object.<String, Boolean>} statuses
    */
    static saveStatuses(statuses) {
      if (!this.flowPath) {
        return;
      }

      this._statuses = statuses;

      try {
        fs.writeFileSync(`${this.flowPath}/_status.json`, JSON.stringify(statuses));
      } catch (err) {
        flowDebug(`error saving status to "${this.flowPath}/_status.json": ${err}`);
      }
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
    initJson(json, cleanVault) {
      flowDebug(`initJson on "${json._id}"`);

      if (!json || !json._id) {
        throw new Error('object containing _id as argument is required');
      }

      // only perform this filename check in master for performance reasons
      if (!XIBLE.child) {
        if (!Flow.validateId(json._id)) {
          throw new Error('flow _id/name cannot contain reserved/unsave characters');
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
          xibleNode = new XIBLE.Node(Object.assign({}, nodeConstr, {
            _id: node._id,
            data: Object.assign({}, node.data),
            left: node.left,
            top: node.top
          }));

          // check for data keys that should be vaulted
          // remove those from the json (the json is used for saving)
          if (cleanVault) {
            const nodeVaultKeys = nodeConstr.vault;
            const nodeVaultData = {};
            if (nodeVaultKeys && Array.isArray(nodeVaultKeys)) {
              for (const dataKey in node.data) {
                if (nodeVaultKeys.indexOf(dataKey) > -1) {
                  nodeVaultData[dataKey] = node.data[dataKey];
                  delete node.data[dataKey];
                }
              }
            }

            if (Object.keys(nodeVaultData).length) {
              xibleNode.vault.set(Object.assign(xibleNode.vault.get() || {}, nodeVaultData));
            }
          }

          if (!xibleNode) {
            throw new Error(`Could not construct node '${node.name}'`);
          }
        }

        this.addNode(xibleNode);

        for (const name in node.inputs) {
          if (!xibleNode.inputs[name]) {
            flowDebug(`Node "${node.name}" does not have input "${name}"`);

            xibleNode.addInput(name, node.inputs[name]);
            xibleNode.nodeExists = false;
            this.runnable = false;
          }

          xibleNode.inputs[name]._id = node.inputs[name]._id;
          xibleNode.inputs[name].global = node.inputs[name].global;
        }

        for (const name in node.outputs) {
          if (!xibleNode.outputs[name]) {
            flowDebug(`Node "${node.name}" does not have output "${name}"`);

            xibleNode.addOutput(name, node.outputs[name]);
            xibleNode.nodeExists = false;
            this.runnable = false;
          }

          xibleNode.outputs[name]._id = node.outputs[name]._id;
          xibleNode.outputs[name].global = node.outputs[name].global || false;
        }

        // construct a dummy editorContents
        if (!xibleNode.nodeExists) {
          xibleNode.editorContent = '';
          for (const key in xibleNode.data) {
            xibleNode.editorContent += `<input type="text" placeholder="${key}" data-outputvalue="${key}" />`;
          }
        }
      }

      // get the connectors
      for (let i = 0; i < json.connectors.length; i += 1) {
        const origin = this.getOutputById(json.connectors[i].origin);
        if (!origin) {
          throw new Error(`Cannot find output by id "${json.connectors[i].origin}"`);
        }

        const destination = this.getInputById(json.connectors[i].destination);
        if (!destination) {
          throw new Error(`Cannot find input by id "${json.connectors[i].destination}"`);
        }

        const xibleConnector = {
          origin,
          destination
        };

        origin.connectors.push(xibleConnector);
        destination.connectors.push(xibleConnector);
      }

      XIBLE.addFlow(this);

      XIBLE.broadcastWebSocket({
        method: 'xible.flow.loadJson',
        runnable: this.runnable,
        flowId: this._id
      });
    }

    /**
    * Saves a flow to the configured flows directory.
    * Rejects if this is not the master thread.
    * @return {Promise.<Flow>}
    */
    save() {
      return new Promise((resolve, reject) => {
        if (XIBLE.child || !this._id || !Flow.flowPath) {
          reject('not master, no _id or no flowPath specified');
          return;
        }

        flowDebug(`saving "${this._id}"`);
        fs.writeFile(`${Flow.flowPath}/${this._id}.json`, JSON.stringify(this.json, null, '\t'), () => {
          resolve(this);
        });
      });
    }

    /**
    * Deletes a flow from the configured flows directory.
    * Rejects if this is not the master thread.
    * @return {Promise.<Flow>}
    */
    delete() {
      return new Promise((resolve, reject) => {
        if (XIBLE.child || !this._id || !Flow.flowPath) {
          reject('not master, no _id or no flowPath specified');
          return;
        }

        if (this.state !== Flow.STATE_STOPPED) {
          reject('flow is not stopped');
          return;
        }

        flowDebug(`deleting "${this._id}"`);
        fs.unlink(`${Flow.flowPath}/${this._id}.json`, () => {
          resolve(this);
        });

        // update status file
        const statuses = Flow.getStatuses();
        delete statuses[this._id];
        Flow.saveStatuses(statuses);

        // remove from Xible instance
        if (XIBLE) {
          delete XIBLE.flows[this._id];
        }

        XIBLE.broadcastWebSocket({
          method: 'xible.flow.delete',
          flowId: this._id
        });
      });
    }

    /**
    * Adds a node to the flow.
    * @param {Node} node The node to add.
    * @return {Node}
    */
    addNode(node) {
      node.flow = this;

      // track direct triggers of nodes
      node.prependListener('trigger', () => {
        const d = new Date();
        // node._trackerTriggerTime = d.getTime();

        node.setTracker({
          message: `start @ ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}:${d.getMilliseconds()}`,
          timeout: 3000
        });
      });

      // track incoming output triggers
      for (const name in node.outputs) {
        node.outputs[name].prependListener('trigger', () => {
          const d = new Date();
          // node._trackerTriggerTime = d.getTime();
          node.setTracker({
            message: `start @ ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}:${d.getMilliseconds()}`,
            timeout: 3000
          });
        });
      }

      // track output triggers
      /*
      //uncommenting this needs to take care of commented _trackerTriggerTime elsewhere
      node.prependListener('triggerout', (output) => {

        if (!output.connectors.length) {
          return;
        }

        let d = new Date();
        let msg;

        if (node._trackerTriggerTime) {

          let diff = d.getTime() - node._trackerTriggerTime;
          msg = `triggered '${output.name}' in ${diff}ms`;

        } else {
          msg = `triggered '${output.name}' @ ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}:${d.getMilliseconds()}`;
        }

        node.setTracker({
          message: msg,
          timeout: 3500
        });

      });
      */

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
      return this.nodes.find(node => node._id === id);
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
      let outputs = [];

      if (globalOutputs) {
        outputs = globalOutputs.filter(globalOutput => globalOutput.type === type);
      } else {
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
      }

      return outputs;
    }

    /**
    * Saves the status (running or not) for this flow by calling Flow.saveStatuses().
    * @param {Boolean} running Status of the flow.
    */
    saveStatus(running) {
      const statuses = Flow.getStatuses();
      statuses[this._id] = !!running;
      Flow.saveStatuses(statuses);
    }

    /**
    * Starts a flow in direct mode, on a given set of nodes.
    * @param {Node[]} nodes Array of nodes to direct. Any node outside this array will be ignored.
    */
    direct(nodes) {
      if (!XIBLE.child) {
        if (this.state !== Flow.STATE_STARTED || !this.directed) {
          return this.forceStart(nodes);
        }

        this.worker.send({
          method: 'directNodes',
          directNodes: nodes
        });

        return Promise.resolve(this);
      }

      // cancel all output triggers
      XIBLE.NodeOutput.prototype.trigger = () => {};

      // set the data accordingly
      // init all of them
      // and fetch the action nodes
      const actionNodes = [];
      const flowState = new FlowState();

      process.nextTick(() => {
        for (let i = 0; i < nodes.length; i += 1) {
          const realNode = this.getNodeById(nodes[i]._id);
          if (!realNode) {
            continue;
          }

          realNode.data = nodes[i].data;
          realNode.emit('init', flowState);

          if (realNode.type === 'action') {
            actionNodes.push(realNode);
          }
        }

          // trigger the action nodes
        for (let i = 0; i < actionNodes.length; i += 1) {
          actionNodes[i].getInputs()
            .filter(input => input.type === 'trigger')
            .forEach((input) => {
              input.emit('trigger', null, flowState);
            });
        }
      });

      return Promise.resolve(this);
    }

    /**
    * Starts a flow. Stops the flow first if it is already started.
    * If the flow is already starting, the returned promise resolves when it has finished starting.
    * @param {Node[]} directNodes nodes to direct
    * @return {Promise}
    */
    forceStart(directNodes) {
      const startFlow = () => this.start(directNodes);

      switch (this.state) {

        case Flow.STATE_INITIALIZING:
          return new Promise((resolve) => {
            this.once('initialized', () => {
              if (
                this.state === Flow.STATE_INITIALIZING ||
                this.state === Flow.STATE_INITIALIZED
              ) {
                resolve(startFlow());
                return;
              }
              resolve(this);
            });
          });

        case Flow.STATE_INITIALIZED:
          return startFlow();

        case Flow.STATE_STOPPED:
          return this.init()
            .then(startFlow);

        case Flow.STATE_STOPPING:
          return new Promise((resolve) => {
            this.once('stopped', () => {
              if (
                this.state === Flow.STATE_STARTING ||
                this.state === Flow.STATE_STARTED
              ) {
                resolve(this);
              }
              resolve(this.forceStart(directNodes));
            });
          });

        case Flow.STATE_STARTED:
          return this.stop()
            .then(() => this.forceStart(directNodes));

        case Flow.STATE_STARTING:
          return new Promise((resolve) => {
            this.once('started', () => resolve(this));
          });

      }
    }

    static get STATE_STOPPED() {
      return 0;
    }

    static get STATE_STOPPING() {
      return 1;
    }

    static get STATE_INITIALIZING() {
      return 2;
    }

    static get STATE_INITIALIZED() {
      return 3;
    }

    static get STATE_STARTING() {
      return 4;
    }

    static get STATE_STARTED() {
      return 5;
    }

    init() {
      const initStartTime = process.hrtime();

      if (!this.runnable) {
        return Promise.reject('not runnable');
      }

      if (XIBLE.child) {
        throw new Error('cannot init a flow from a worker');
      }

      // check and set the correct state
      if (this.state !== Flow.STATE_STOPPED) {
        return Promise.reject('cannot init; flow is not stopped');
      }
      this.state = Flow.STATE_INITIALIZING;

      return new Promise((resolve, reject) => {
        flowDebug('initializing flow from master');

        XIBLE.broadcastWebSocket({
          method: 'xible.flow.initializing',
          flowId: this._id,
          directed: this.directed
        });

        if (!fork) {
          fork = require('child_process').fork;
        }

        this.worker = fork(`${__dirname}/../../child.js`);
        this.worker.on('message', (message) => {
          switch (message.method) {

            case 'initializing':

              if (this.worker && this.worker.connected) {
                const initializingDiff = process.hrtime(initStartTime);
                flowDebug(`flow/worker initializing in ${initializingDiff[0] * 1000 + (initializingDiff[1] / 1e6)}ms`);

                this.worker.send({
                  method: 'init',
                  configPath: XIBLE.configPath,
                  config: XIBLE.Config.getAll(),
                  flow: this.json,
                  nodes: XIBLE.nodes
                });
              } else {
                flowDebug('flow/worker has init, but no such worker in master');
                reject('no such worker in master');
              }

              break;

            case 'initialized':

              const initializedDiff = process.hrtime(initStartTime);
              flowDebug(`flow/worker initialized in ${initializedDiff[0] * 1000 + (initializedDiff[1] / 1e6)}ms`);

              this.state = Flow.STATE_INITIALIZED;
              resolve(this);
              this.emit('initialized');

              XIBLE.broadcastWebSocket({
                method: 'xible.flow.initialized',
                flowId: this._id,
                directed: this.directed
              });

              break;

            case 'started':

              this.state = Flow.STATE_STARTED;
              this.emit('started');

              XIBLE.broadcastWebSocket({
                method: 'xible.flow.started',
                flowId: this._id,
                directed: this.directed
              });

              break;

            case 'startFlowById':

              const flow = XIBLE.getFlowById(message.flowId);
              if (flow) {
                flow.forceStart().then(() => {
                  if (this.worker && this.worker.connected) {
                    this.worker.send({
                      method: 'flowStarted',
                      flowId: message.flowId
                    });
                  }
                });
              } else if (this.worker && this.worker.connected) {
                this.worker.send({
                  method: 'flowNotExist',
                  flowId: message.flowId
                });
              }

              break;

            case 'stop':

              this.forceStop();
              break;

            case 'broadcastWebSocket':

              XIBLE.broadcastWebSocket(message.message);
              break;

            case 'usage':

              this.usage = message.usage;
              break;

          }
        });

        this.worker.on('exit', () => {
          this.state = Flow.STATE_STOPPED;
          this.worker = null;
          this.usage = null;

          this.emit('stopped');
          XIBLE.broadcastWebSocket({
            method: 'xible.flow.stopped',
            flowId: this._id
          });

          flowDebug('worker exited');

          if (this.initLevel === Flow.INITLEVEL_FLOW) {
            this.init()
              .catch((err) => { console.error(err); });
          }
        });

        this.worker.on('disconnect', () => {
          flowDebug('worker disconnected from master');
          this.usage = null;

          // cleanup all open statuses
          XIBLE.broadcastWebSocket({
            method: 'xible.flow.removeAllStatuses',
            flowId: this._id
          });
        });
      });
    }

    /**
    * Starts a flow. Rejects if flow is not stopped
    * Note that the behaviour is different when called from a worker process
    * @param  {Node[]} directNodes  nodes to direct
    * @return {Promise}
    */
    start(directNodes) {
      if (!this.runnable) {
        return Promise.reject('not runnable');
      }

      if (!XIBLE.child) {
        // check and set the correct state
        if (this.state !== Flow.STATE_INITIALIZED) {
          return Promise.reject('cannot start; flow is not initialized');
        }
        this.state = Flow.STATE_STARTING;

        const startTime = process.hrtime();

        return new Promise((resolve) => {
          // let client now we're starting up the flow
          XIBLE.broadcastWebSocket({
            method: 'xible.flow.starting',
            flowId: this._id,
            directed: !!directNodes
          });

          flowDebug('starting flow from master');

          // save the status
          if (!directNodes) {
            this.saveStatus(true);
            this.directed = false;
          } else {
            this.directed = true;
          }

          if (this.worker && this.worker.connected) {
            this.worker.on('message', (message) => {
              switch (message.method) {

                case 'started':

                  const startedDiff = process.hrtime(startTime);
                  flowDebug(`flow/worker started in ${startedDiff[0] * 1000 + (startedDiff[1] / 1e6)}ms`);

                  resolve(this);
                  break;

              }
            });

            this.worker.send({
              method: 'start',
              directNodes
            });
          }
        });
      }

      flowDebug('starting flow from worker');

      const flowState = new FlowState();

      process.nextTick(() => {
          // init all nodes
        for (let i = 0; i < this.nodes.length; i += 1) {
          this.nodes[i].emit('init', flowState);
        }

          // trigger all event objects that are listening
        for (let i = 0; i < this.nodes.length; i += 1) {
          if (this.nodes[i].type === 'event') {
            this.nodes[i].emit('trigger', flowState);
          }
        }
      });

      return Promise.resolve(this);
    }

    /**
    * Stops a flow.
    * If the flow is in starting mode, it will stop it after it has finished starting.
    * @return {Promise}
    */
    forceStop() {
      const stopFlow = () => this.stop();

      switch (this.state) {

        case Flow.STATE_INITIALIZING:
          return new Promise((resolve) => {
            this.once('initialized', () => {
              resolve(this.forceStop());
            });
          });

        case Flow.STATE_INITIALIZED: case Flow.STATE_STARTED:
          return stopFlow();

        case Flow.STATE_STARTING:
          return new Promise((resolve) => {
            this.once('started', () => {
              resolve(this.forceStop());
            });
          });

        case Flow.STATE_STOPPED:
          return Promise.resolve(this);

        case Flow.STATE_STOPPING:
          return new Promise((resolve) => {
            this.once('stopped', () => {
              resolve(this);
            });
          });

      }
    }

    /**
    * Stops a flow. Will forcibly kill the flow if it is still running after 5 seconds.
    * Note that the behaviour is different when called from a worker process.
    * @return {Promise}
    */
    stop() {
      if (!XIBLE.child) {
        if (this.state !== Flow.STATE_STARTED && this.state !== Flow.STATE_INITIALIZED) {
          return Promise.reject('cannot stop; flow is not started or initialized');
        }
        this.state = Flow.STATE_STOPPING;

        return new Promise((resolve) => {
          this.saveStatus(false);

          if (this.worker) {
            XIBLE.broadcastWebSocket({
              method: 'xible.flow.stopping',
              flowId: this._id
            });

            flowDebug('stopping flow from master');
            let killTimeout;

            this.worker.once('exit', () => {
              if (killTimeout) {
                clearTimeout(killTimeout);
                killTimeout = null;
              }

              resolve(this);
            });

            this.worker.on('disconnect', () => {
              if (this.worker) {
                flowDebug('killing worker the normal way');
                this.worker.kill();
              } else if (killTimeout) {
                clearTimeout(killTimeout);
                killTimeout = null;
              }
            });

            this.worker.send({
              method: 'stop'
            });

            this.worker.disconnect();

            // forcibly kill after 5 seconds
            killTimeout = setTimeout(() => {
              flowDebug('killing worker from master using SIGKILL');
              this.worker.kill('SIGKILL');

              // cleanup all open statuses
              XIBLE.broadcastWebSocket({
                method: 'xible.flow.removeAllStatuses',
                flowId: this._id
              });

              killTimeout = null;
            }, 5000);
          } else {
            resolve(this);
          }
        });
      }

      flowDebug('stopping flow from worker');

        // close any node that wants to
      this.nodes.forEach(node => node.emit('close'));

      flowDebug('stopped flow from worker');

      process.exit(0);
    }

  }

  /**
  * Contains a flow state.
  * @constructor
  * @class
  * @param {Object.<String, Object>} states
  */
  function FlowState(states = {}) {
    /**
    * Sets a state for a given node.
    * Freezes the object to disallow any future adjustments.
    * @param  {Node}  node
    * @param  {Object}  obj
    */
    this.set = function (node, obj) {
      if (!(node instanceof XIBLE.Node)) {
        throw new Error('node must be instanceof Node');
      } else if (!(obj instanceof Object)) {
        throw new Error('obj must be instanceof Object');
      }

      Object.freeze(obj);
      states[node._id] = obj;
    };

    /**
    * Gets a state for a given node.
    * @param  {Node}  node
    * @return  {Object}
    */
    this.get = function (node) {
      if (!(node instanceof XIBLE.Node)) {
        throw new Error('node must be instanceof Node');
      }

      return states[node._id];
    };

    /**
    * Splits the flowState into a new flowState
    * @return  {FlowState}  the new flowState
    */
    this.split = function () {
      return new FlowState(Object.assign({}, states));
    };

    Object.freeze(this);
  }

  XIBLE.FlowState = FlowState;

  if (EXPRESS_APP) {
    require('./routes.js')(Flow, XIBLE, EXPRESS_APP);
  }

  return {
    Flow
  };
};
