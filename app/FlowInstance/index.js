'use strict';

const EventEmitter = require('events').EventEmitter;
const debug = require('debug');

// lazy requires
let fork;

const flowInstanceDebug = debug('xible:flowInstance');

module.exports = (XIBLE) => {
  // check inspect arguments so we can fork properly
  let inspectPortNumberIncrement = 0;
  let inspectLevel = 0;
  if (process.execArgv.some(arg => arg.includes('--inspect='))) {
    inspectLevel = 1;
  } else if (process.execArgv.some(arg => arg.includes('--inspect-brk='))) {
    inspectLevel = 2;
  }

  class FlowInstance extends EventEmitter {
    constructor(flow, params, directNodes) {
      super();

      this._id = XIBLE.generateObjectId();
      this.worker = null;
      this.usage = null;
      this.state = FlowInstance.STATE_STOPPED;
      this.timing = {};

      this.flow = flow;
      this.params = params || {};
      this.directNodes = directNodes;
      this.directed = !!directNodes;
    }

    init() {
      if (XIBLE.child) {
        return Promise.reject(new Error('cannot init a flowInstance from a worker'));
      }

      delete this.timing.initEnd;
      delete this.timing.startStart;
      delete this.timing.startEnd;

      this.timing.initStart = process.hrtime();

      // check and set the correct state
      if (this.state !== FlowInstance.STATE_STOPPED) {
        return Promise.reject(new Error('cannot init; flowInstance is not stopped'));
      }
      this.state = FlowInstance.STATE_INITIALIZING;

      return new Promise((resolve, reject) => {
        flowInstanceDebug('initializing flow from master');

        this.emit('initializing');

        if (!fork) {
          fork = require('child_process').fork;
        }

        let flow;
        const execArgv = [];
        if (inspectLevel === 1) {
          execArgv.push(`--inspect=0.0.0.0:${9229 + (inspectPortNumberIncrement += 1)}`);
        } else if (inspectLevel === 2) {
          execArgv.push(`--inspect-brk=0.0.0.0:${9229 + (inspectPortNumberIncrement += 1)}`);
        }
        this.worker = fork(`${__dirname}/../../child.js`, {
          execArgv
        });

        this.worker.on('message', (message) => {
          switch (message.method) {
            case 'initializing':
              if (this.worker && this.worker.connected) {
                const initializingDiff = process.hrtime(this.timing.initStart);

                flowInstanceDebug(`flow/worker initializing in ${(initializingDiff[0] * 1000) + (initializingDiff[1] / 1e6)}ms`);

                this.worker.send({
                  method: 'init',
                  flowInstanceId: this._id,
                  configPath: XIBLE.configPath,
                  config: XIBLE.Config.getAll(),
                  flow: this.flow.json,
                  nodes: XIBLE.nodes
                });
              } else {
                flowInstanceDebug('flow/worker has init, but no such worker in master');
                reject('no such worker in master');
              }

              break;

            case 'initialized': {
              this.timing.initEnd = process.hrtime();
              const initializedDiff = process.hrtime(this.timing.initStart);
              flowInstanceDebug(`flow/worker initialized in ${(initializedDiff[0] * 1000) + (initializedDiff[1] / 1e6)}ms`);

              this.state = FlowInstance.STATE_INITIALIZED;
              resolve(this);
              this.emit('initialized');
              break;
            }

            case 'started':
              this.state = FlowInstance.STATE_STARTED;
              this.emit('started');
              break;

            case 'stop':
              this.forceStop();
              break;

            case 'xible.flow.start':
              flow = XIBLE.getFlowById(message.flowId);
              if (flow) {
                flow.createInstance({ params: message.params }).forceStart()
                .then((flowInstance) => {
                  if (this.worker && this.worker.connected) {
                    this.worker.send({
                      method: 'flowStarted',
                      flowId: message.flowId,
                      flowInstanceId: flowInstance._id
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

            case 'xible.flow.getById': {
              flow = XIBLE.getFlowById(message.flowId);
              let returnFlow = null;
              if (flow) {
                returnFlow = {
                  _id: flow._id,
                  name: flow.name,
                  runnable: flow.runnable,
                  initLevel: flow.initLevel
                };
              }
              this.worker.send({
                method: 'returnFlow',
                flowId: message.flowId,
                flow: returnFlow
              });
              break;
            }

            case 'xible.flow.instance.getById': {
              flow = XIBLE.getFlowById(message.flowId);
              let returnFlowInstance = null;
              if (flow) {
                const flowInstance = flow.getInstanceById(message.flowInstanceId);
                if (flowInstance) {
                  returnFlowInstance = {
                    _id: flowInstance._id,
                    directed: flowInstance.directed,
                    state: flowInstance.state,
                    timing: flowInstance.timing
                  };
                }
              }
              this.worker.send({
                method: 'returnFlowInstance',
                flowId: message.flowId,
                flowInstanceId: message.flowInstanceId,
                flowInstance: returnFlowInstance
              });
              break;
            }

            case 'xible.flow.stop':
              this.flow.stopAllInstances();
              break;

            case 'xible.flow.instance.stop':
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
          this.state = FlowInstance.STATE_STOPPED;
          this.worker = null;
          this.usage = null;

          this.emit('stopped');
          flowInstanceDebug('worker exited');

          if (this.flow && this.flow.instances.includes(this)) {
            this.delete();
          }
        });

        this.worker.on('disconnect', () => {
          flowInstanceDebug('worker disconnected from master');
          this.usage = null;

          // cleanup all open statuses
          XIBLE.broadcastWebSocket({
            method: 'xible.flow.instance.removeAllStatuses',
            flowInstanceId: this._id,
            flowId: this.flow._id
          });
        });
      });
    }

    /**
     * Starts a flowInstance. Rejects if flow is not in a stopped state.
     * Note that the behaviour is different when called from a worker process.
     * @param {Object} params
     * @param {Node[]} directNodes nodes to direct
     * @return {Promise}
     */
    start() {
      if (XIBLE.child) {
        return this.startChild();
      }

      // check and set the correct state
      if (this.state !== FlowInstance.STATE_INITIALIZED) {
        return Promise.reject(new Error('cannot start; flowInstance is not initialized'));
      }
      this.state = FlowInstance.STATE_STARTING;

      this.timing.startStart = process.hrtime();

      return new Promise((resolve) => {
        this.emit('starting');

        flowInstanceDebug('starting flowInstance from master');

        if (this.worker && this.worker.connected) {
          this.worker.on('message', (message) => {
            switch (message.method) {
              case 'started': {
                this.timing.startEnd = process.hrtime();
                const startedDiff = process.hrtime(this.timing.startStart);
                flowInstanceDebug(`flowInstance/worker started in ${(startedDiff[0] * 1000) + (startedDiff[1] / 1e6)}ms`);

                if (!this.directed) {
                  this.flow.saveStatus();
                }
                resolve(this);
                break;
              }
            }
          });

          this.worker.send({
            method: 'start',
            flowInstanceId: this._id,
            directNodes: this.directNodes,
            params: this.params
          });
        }
      });
    }

    /**
     * Starts a flowInstance from the worker process.
     * @private
     * @fires Node#trigger
     * @fires Node#init
     * @returns {Promise.<FlowInstance>} The current flow instance is returned upon completion.
     */
    async startChild() {
      flowInstanceDebug('starting flowInstance from worker');

      const flowState = new XIBLE.FlowState();

      /* Assign the flowInstance to each node.
       * This will not cause problems with multiple instances of the same flow,
       * since each of those instances runs in its own process
       * with its own unique copy of this.flow.
       */
      for (let i = 0; i < this.flow.nodes.length; i += 1) {
        this.flow.nodes[i].flowInstance = this;
      }

      process.nextTick(() => {
        // init all nodes
        for (let i = 0; i < this.flow.nodes.length; i += 1) {
          this.flow.nodes[i].emit('init', flowState);
        }

        // trigger all event objects that are listening
        for (let i = 0; i < this.flow.nodes.length; i += 1) {
          const node = this.flow.nodes[i];
          if (node.type === 'event') {
            node.emit('triggerStartTime', 'input');
            node.emit('trigger', flowState);
          }
        }
      });

      return this;
    }

    /**
     * Starts a flow in direct mode, on a given set of nodes.
     * @param {Node[]} nodes Array of nodes to direct. Any node outside this array will be ignored.
     * @throws {Error} Will throw if called from a child/worker.
     * @returns {Promise.<FlowInstance>} The current flow instance is returned upon completion.
     */
    async direct(nodes) {
      if (XIBLE.child) {
        throw new Error('should not be called from child');
      }

      if (this.state !== FlowInstance.STATE_STARTED || !this.directed) {
        this.directNodes = nodes;
        this.directed = true;
        return this.forceStart();
      }

      this.worker.send({
        method: 'directNodes',
        directNodes: nodes
      });

      return this;
    }

    /**
     * Directs the flowInstance from the worker.
     * @private
     * @throws {Error} Will throw if called from master.
     * @returns {Promise.<FlowInstance>} The current flow instance is returned upon completion.
     */
    async directChild(nodes) {
      if (!XIBLE.child) {
        throw new Error('should not be called from master');
      }

      // cancel all output triggers
      XIBLE.NodeOutput.prototype.trigger = () => {};

      // set the data accordingly
      // init all of them
      // and fetch the action nodes
      const actionNodes = [];
      const flowState = new XIBLE.FlowState();

      process.nextTick(() => {
        for (let i = 0; i < nodes.length; i += 1) {
          const realNode = this.flow.getNodeById(nodes[i]._id);
          if (!realNode) {
            continue;
          }

          realNode.flowInstance = this;
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

      return this;
    }

    /**
     * Deletes a FlowInstance
     */
    async delete() {
      if (!this.flow) {
        throw new Error('instance must be associated with a flow');
      }

      this.emit('delete');
      return this.flow.deleteInstance(this);
    }

    /**
     * Starts a flow. Stops the flow first if it is already started.
     * If the flow is already starting, the returned promise resolves when it has finished starting.
     * @param {Object} params
     * @param {Node[]} directNodes nodes to direct
     * @return {Promise}
     */
    forceStart() {
      const startFlow = () => this.start();

      switch (this.state) {
        case FlowInstance.STATE_INITIALIZING:
          return new Promise((resolve) => {
            this.once('initialized', () => {
              if (
                this.state === FlowInstance.STATE_INITIALIZING ||
                this.state === FlowInstance.STATE_INITIALIZED
              ) {
                resolve(startFlow());
                return;
              }
              resolve(this);
            });
          });

        case FlowInstance.STATE_INITIALIZED:
          return startFlow();

        case FlowInstance.STATE_STOPPED:
          return this.init()
          .then(startFlow);

        case FlowInstance.STATE_STOPPING:
          return new Promise((resolve) => {
            this.once('stopped', () => {
              if (
                this.state === FlowInstance.STATE_STARTING ||
                this.state === FlowInstance.STATE_STARTED
              ) {
                resolve(this);
              }
              resolve(this.forceStart());
            });
          });

        case FlowInstance.STATE_STARTED:
          return this.stop()
          .then(() => this.forceStart());

        case FlowInstance.STATE_STARTING:
          return new Promise((resolve) => {
            this.once('started', () => resolve(this));
          });
      }

      return Promise.reject(new Error('Flow in unknown state'));
    }

    /**
     * Stops a flow. Will forcibly kill the flow if it is still running after 5 seconds.
     * Note that the behaviour is different when called from a worker process.
     * @param {Boolean} [deleteInstance=true] Delete the instance when the flow has stopped.
     * @return {Promise}
     */
    stop(deleteInstance = true) {
      if (XIBLE.child) {
        return this.stopChild();
        // return Promise.reject(new Error('should not be called from child'));
      }

      if (
        this.state !== FlowInstance.STATE_STARTED &&
        this.state !== FlowInstance.STATE_INITIALIZED
      ) {
        return Promise.reject(new Error('cannot stop; flowInstance is not started or initialized'));
      }
      this.state = FlowInstance.STATE_STOPPING;

      if (!XIBLE.stopping) {
        this.flow.saveStatus();
      }

      if (deleteInstance) {
        this.on('stopped', () => {
          this.delete();
        });
      }

      return new Promise((resolve) => {
        if (this.worker) {
          this.emit('stopping');

          flowInstanceDebug('stopping flowInstance from master');
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
              flowInstanceDebug('killing worker the normal way');
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
            flowInstanceDebug('killing worker from master using SIGKILL');
            this.worker.kill('SIGKILL');

            // cleanup all open statuses
            XIBLE.broadcastWebSocket({
              method: 'xible.flow.instance.removeAllStatuses',
              flowInstanceId: this._id,
              flowId: this.flow._id
            });

            killTimeout = null;
          }, 5000);
        } else {
          resolve(this);
        }
      });
    }

    /**
     * Stops the flowInstance from the worker.
     * @private
     */
    stopChild() {
      if (!XIBLE.child) {
        throw new Error('should not be called from master');
      }

      flowInstanceDebug('stopping flowInstance from worker');

      // close any node that wants to
      this.flow.nodes.forEach(node => node.emit('close'));

      flowInstanceDebug('stopped flowInstance from worker');
      process.exit(0);
    }

    /**
     * Stops a flow.
     * If the flow is in starting mode, it will stop it after it has finished starting.
     * @param {Boolean} [deleteInstance=true] Delete the instance when the flow has stopped.
     * @return {Promise}
     */
    forceStop(deleteInstance) {
      const stopFlow = () => this.stop(deleteInstance);

      switch (this.state) {
        case FlowInstance.STATE_INITIALIZING:
          return new Promise((resolve) => {
            this.once('initialized', () => {
              resolve(this.forceStop(deleteInstance));
            });
          });

        case FlowInstance.STATE_INITIALIZED:
        case FlowInstance.STATE_STARTED:
          return stopFlow();

        case FlowInstance.STATE_STARTING:
          return new Promise((resolve) => {
            this.once('started', () => {
              resolve(this.forceStop(deleteInstance));
            });
          });

        case FlowInstance.STATE_STOPPED:
          return Promise.resolve(this);

        case FlowInstance.STATE_STOPPING:
          return new Promise((resolve) => {
            this.once('stopped', () => {
              resolve(this);
            });
          });
      }

      return Promise.reject(new Error('Flow in unknown state'));
    }

    emit(eventName, ...params) {
      super.emit(eventName, ...params);

      XIBLE.broadcastWebSocket({
        method: `xible.flow.instance.${eventName}`,
        flowInstanceId: this._id,
        flowInstance: this,
        flowId: this.flow._id
      });
    }

    toJSON() {
      return {
        _id: this._id,
        state: this.state,
        directed: this.directed,
        timing: this.timing,
        params: this.params,
        usage: this.usage,
        flowId: (this.flow ? this.flow._id : null)
      };
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
  }

  return {
    FlowInstance
  };
};
