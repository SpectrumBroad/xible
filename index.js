'use strict';

const {EventEmitter} = require('events');
const os = require('os');
const fs = require('fs');
const debug = require('debug');

// setup debug
const xibleDebug = debug('xible');
const webSocketDebug = debug('xible:webSocket');
const expressDebug = debug('xible:express');

/*
* Serve socket messages every x milliseconds.
* If the value is smaller than 1, throttling is disabled.
*/
const WEB_SOCKET_THROTTLE = 100;

/*
* Amount of milliseconds between stat fetches for running flows.
* A value below WEB_SOCKET_THROTTLE won't have any effect.
*/
const STAT_INTERVAL = 1000;

function handleBroadcastWebSocketError(err) {
  if (err) {
    webSocketDebug(`client websocket send failed: ${err}`);
  }
}

let broadcastWebSocketMessagesThrottle = [];

class Xible extends EventEmitter {
  constructor({ configPath, configTmp, child }, configObj) {
    super();

    this.nodes = {};
    this.flows = {};

    if (typeof configPath === 'string') {
      this.configPath = this.resolvePath(configPath);
    }

    this.child = false;
    if (child) {
      this.child = true;
    }

    if (!this.child) {
      xibleDebug(process.versions);
    }

    this.secure = false;
    this.webPortNumber = null;
    this.webSslPortNumber = null;
    this.plainWebServer = null;
    this.secureWebServer = null;

    // tracks whether this XIBLE instance is stopping.
    this.stopping = false;

    let appNames;
    if (this.child) {
      appNames = ['Flow', 'FlowInstance', 'FlowState', 'Node', 'TypeDef'];
    } else {
      this.initWeb();
      this.persistentWebSocketMessages = {};
      appNames = ['CliQueue', 'Flow', 'FlowInstance', 'NodePack', 'Node', 'TypeDef', 'Registry'];
    }

    this.Config = require('./app/Config/index.js')(this, this.expressApp, configObj, configTmp).Config;
    for (let i = 0; i < appNames.length; i += 1) {
      Object.assign(this, require(`./app/${appNames[i]}/index.js`)(this, this.expressApp));
    }
  }

  /**
  * Creates a PID file in path `${this.configPath}.pid`
  */
  writePidFile() {
    if (!this.configPath) {
      throw new Error('Cannot write PID file, configPath not set.');
    }
    fs.writeFile(`${this.configPath}.pid`, process.pid.toString(), {
      mode: 0o600
    }, (err) => {
      if (err) {
        throw err;
      }
      xibleDebug('PID file created');
    });
  }

  /**
  * Removes the PID file from path `${this.configPath}.pid`
  * This is a sync action as it can be called on process.exit
  */
  removePidFile() {
    if (!this.configPath) {
      throw new Error('Cannot remove PID file, configPath not set.');
    }
    try {
      fs.unlinkSync(`${this.configPath}.pid`);
      xibleDebug('PID file removed');
    } catch (err) {
      // console.error(err);
    }
  }

  /**
   * Verifies whether a XIBLE instance is running on the PID file.
   * @returns {Promise.<Boolean>}
   */
  verifyPidIsRunning() {
    return new Promise((resolve) => {
      fs.readFile(`${this.configPath}.pid`, (err, pid) => {
        if (err) {
          resolve(false);
          return;
        }

        if (!pid.length) {
          resolve(false);
        }

        let running;
        try {
          running = process.kill(pid, 0);
        } catch (killErr) {
          running = killErr.code === 'EPERM';
        }

        resolve(running);
      });
    });
  }

  // load nodes and flows
  async init(obj) {
    xibleDebug('init');

    if (await this.verifyPidIsRunning()) {
      throw new Error('XIBLE is already running.');
    }

    this.stopping = false;

    this.initStats();

    if (this.child) {
      return null;
    }

    // write PID file
    this.writePidFile();
    this.CliQueue.init();

    // handle SIG
    process.on('SIGINT', () => {
      process.exit(1);
    });
    process.on('SIGTERM', () => {
      process.exit(1);
    });

    // gracefully exit
    process.on('exit', () => {
      this.close();
    });

    await this.startWeb();

    // throttle broadcast messages
    if (WEB_SOCKET_THROTTLE > 0) {
      setInterval(() => {
        if (broadcastWebSocketMessagesThrottle.length) {
          const message = JSON.stringify({
            method: 'xible.messages',
            messages: broadcastWebSocketMessagesThrottle
          });
          broadcastWebSocketMessagesThrottle = [];

          this.broadcastWebSocket(message);
        }
      }, WEB_SOCKET_THROTTLE).unref();
    }

    // ensure catch all routes are loaded last
    if (this.expressApp) {
      require('./routes.js')(this, this.expressApp);
    }

    // load nodepacks/nodes
    const nodePacks = await this.NodePack.getAll();
    for (const nodePackName in nodePacks) {
      await nodePacks[nodePackName].initNodes();
    }

    // get all installed flows
    if (!obj || !obj.nodeNames) {
      const flowPath = this.Config.getValue('flows.path');
      if (flowPath) {
        await this.Flow.init(this.resolvePath(flowPath));
      }
    }
  }

  initStats() {
    if (!this.child) {
      // throttle broadcast flow stats every second
      setInterval(() => {
        const flows = this.getFlows();
        const usage = {};
        for (const flowId in flows) {
          for (let i = 0; i < flows[flowId].instances.length; i += 1) {
            const instance = flows[flowId].instances[i];
            if (
              instance.state === instance.STATE_STOPPED
              || !instance.usage
            ) {
              continue;
            }

            if (!usage[flowId]) {
              usage[flowId] = [];
            }
            usage[flowId].push({
              flowInstanceId: instance._id,
              usage: instance.usage
            });
          }
        }

        this.broadcastWebSocket({
          method: 'xible.flow.usage',
          usage
        });
      }, STAT_INTERVAL).unref();

      return;
    }

    // report cpu and memory usage back to master
    // note that, at least on a raspi 3,
    // the resolution of cpuUsage is stuck to 1000ms or 1%
    let cpuUsageStart = process.cpuUsage();
    let cpuStartTime = process.hrtime();

    setInterval(() => {
      // get values over passed time
      const cpuUsage = process.cpuUsage(cpuUsageStart);
      const cpuTime = process.hrtime(cpuStartTime);

      /*
      * reset for next loop
      * this is different from the setImmediate approach for getting event loop delay
      * because we are using a setInterval, we may get negative delays back
      * not sure yet if that's correct or not
      */
      cpuUsageStart = process.cpuUsage();
      cpuStartTime = process.hrtime();

      if (process.connected) {
        process.send({
          method: 'usage',
          usage: {
            cpu: {
              user: cpuUsage.user,
              system: cpuUsage.system,
              percentage: Math.round(
                100 * ((cpuUsage.user + cpuUsage.system) / 1000)
                / (cpuTime[0] * 1000 + cpuTime[1] / 1e6)
              )
            },
            memory: process.memoryUsage(),
            delay: Math.round((cpuTime[0] * 1e9 + cpuTime[1] - STAT_INTERVAL * 1e6) / 1000)
          }
        });
      }
    }, STAT_INTERVAL).unref();
  }

  static resolvePath(path) {
    return path.replace(/^~/, os.homedir());
  }

  resolvePath(path) { // eslint-disable-line
    return path.replace(/^~/, os.homedir());
  }

  static getNativeModules() {
    return Object.keys(process.binding('natives')).filter((el) => !/^_|^internal|\//.test(el));
  }

  static generateObjectId() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return `${s4() + s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
  }

  generateObjectId() {  // eslint-disable-line
    return Xible.generateObjectId();
  }

  /**
   * Stops XIBLE.
   * This stops the webserver, removes the pid and cliqueue files.
   */
  close() {
    this.stopping = true;

    const flows = this.getFlows();
    for (const flowId in flows) {
      flows[flowId].deleteAllInstances();
    }

    this.stopWeb();
    this.CliQueue.close();
    this.CliQueue.removeFile();
    this.removePidFile();

    xibleDebug('close');
  }

  /**
   * Stops the webserver.
   */
  stopWeb() {
    xibleDebug('stopWeb');

    if (this.webSocketServer) {
      this.webSocketServer.close();
    }

    if (this.plainWebServer) {
      this.plainWebServer.close();
    }

    if (this.secureWebServer) {
      this.secureWebServer.close();
    }
  }

  /**
   * Starts the webserver.
   */
  async startWeb() {
    return new Promise((resolve) => {
      xibleDebug('startWeb');

      // setup client requests over https
      const spdy = require('spdy');
      const {expressApp} = this;

      // editor
      expressApp.use(this.express.static(`${__dirname}/editor`, {
        index: false
      }));

      // init the webserver
      const webPortNumber = this.Config.getValue('webserver.portnumber') || 9600;
      this.webPortNumber = webPortNumber;
      expressDebug(`starting on port: ${webPortNumber}`);

      const onListen = (webServer) => {
        const address = webServer.address();
        const {port} = address;

        expressDebug(`listening on: ${address.address}:${port}`);

        if (this.secure && port === webPortNumber) {
          return;
        }

        // websocket
        const wsDebug = debug('xible:websocket');
        const ws = require('ws'); // uws is buggy right now

        wsDebug(`listening on port: ${webPortNumber}`);

        const webSocketServer = new ws.Server({
          server: webServer,
          ssl: this.secure
        });
        this.webSocketServer = webSocketServer;

        webSocketServer.on('connection', (client) => {
          webSocketDebug('connection');

          client.on('error', (err) => {
            webSocketDebug(`error: ${err}`);
          });

          client.on('close', () => {
            webSocketDebug('close');
          });
        });

        resolve();
      };

      // spdy (https)
      const webSslPortNumber = this.Config.getValue('webserver.ssl.portnumber') || 9601;
      this.webSslPortNumber = webSslPortNumber;
      const webSslKeyPath = this.Config.getValue('webserver.ssl.keypath');
      const webSslKeyCert = this.Config.getValue('webserver.ssl.certpath');
      if (webSslPortNumber && webSslKeyPath && webSslKeyCert) {
        expressDebug('starting spdy (https)');
        this.secure = true;

        this.secureWebServer = spdy.createServer({
          key: fs.readFileSync(webSslKeyPath),
          cert: fs.readFileSync(webSslKeyCert)
        }, expressApp).listen(webSslPortNumber, () => onListen(this.secureWebServer));

        expressApp.settings.port = webSslPortNumber;
      } else {
        expressApp.settings.port = webPortNumber;
      }

      expressDebug('starting plain (http)');
      this.plainWebServer = expressApp.listen(webPortNumber, () => onListen(this.plainWebServer));
    });
  }

  initWeb() {
    xibleDebug('initWeb');

    this.express = require('express');
    this.expressApp = this.express();
    this.expressApp.use(require('body-parser').json());

    this.expressApp.disable('x-powered-by');

    // setup default express stuff
    this.expressApp.use((req, res, next) => {
      // check for TLS
      if (this.secure && !req.secure) {
        res.redirect(`https://${req.host}:${this.webSslPortNumber}${req.originalUrl}`);
        return;
      }

      expressDebug(`${req.method} ${req.originalUrl}`);

      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }

      // caching
      res.header('cache-control', 'private, max-age=2');

      // local vars for requests
      req.locals = {};

      next();
    });
  }

  setPersistentWebSocketMessage(message) {
    if (!this.persistentWebSocketMessages[message.flowInstanceId]) {
      this.persistentWebSocketMessages[message.flowInstanceId] = {};
    }

    if (!this.persistentWebSocketMessages[message.flowInstanceId][message.nodeId]) {
      this.persistentWebSocketMessages[message.flowInstanceId][message.nodeId] = {};
    }

    this.persistentWebSocketMessages[message.flowInstanceId][message.nodeId][message.status._id] = message;
  }

  deletePersistentWebSocketMessage(message) {
    if (!this.persistentWebSocketMessages[message.flowInstanceId]) {
      return;
    }

    if (!this.persistentWebSocketMessages[message.flowInstanceId][message.nodeId]) {
      return;
    }

    delete this.persistentWebSocketMessages[message.flowInstanceId][message.nodeId][message.status._id];
  }

  broadcastWebSocket(message) {
    let copyMessage;

    if (!this.webSocketServer) {
      return;
    }

    // throttle any message that's not a string
    if (typeof message !== 'string') {
      // save some messages to replay on new connections
      switch (message.method) {
        case 'xible.node.addStatus':
        case 'xible.node.setTracker':
        case 'xible.node.addProgressBar':
          this.setPersistentWebSocketMessage(message);

          if (message.status.timeout) {
            setTimeout(() => {
              this.deletePersistentWebSocketMessage(message);
            }, message.status.timeout).unref();
          }

          break;

        case 'xible.node.updateProgressBarById':
          copyMessage = { ...message};
          copyMessage.method = 'xible.node.addProgressBar';
          this.setPersistentWebSocketMessage(copyMessage);

          break;

        case 'xible.node.updateStatusById':
          copyMessage = { ...message};
          copyMessage.method = 'xible.node.addStatus';
          this.setPersistentWebSocketMessage(copyMessage);

          break;

        case 'xible.node.removeStatusById':
          this.deletePersistentWebSocketMessage(message);
          break;

        case 'xible.node.removeAllStatuses':
          if (
            this.persistentWebSocketMessages[message.flowInstanceId]
            && this.persistentWebSocketMessages[message.flowInstanceId][message.nodeId]
          ) {
            delete this.persistentWebSocketMessages[message.flowInstanceId][message.nodeId];
          }
          break;

        case 'xible.flow.instance.removeAllStatuses':
          if (this.persistentWebSocketMessages[message.flowInstanceId]) {
            delete this.persistentWebSocketMessages[message.flowInstanceId];
          }
          break;
      }

      if (WEB_SOCKET_THROTTLE > 0) {
        broadcastWebSocketMessagesThrottle.push(message);
        return;
      }

      message = JSON.stringify(message);
    }

    this.webSocketServer.clients.forEach((client) => {
      client.send(message, handleBroadcastWebSocketError);
    });
  }

  addNode(obj) {
    if (!obj || !obj.name) {
      throw new Error('Argument needs to be an object with a name parameter');
    }
    const {name} = obj;

    // check if a similar node with the same name doesn't already exist
    if (this.nodes[name]) {
      return this.nodes[name];
    }

    this.nodes[name] = obj;
    return obj;
  }

  getNodes() {
    return this.nodes;
  }

  getNodeByName(name) {
    return this.nodes[name];
  }

  addFlow(flow, callback) {
    this.flows[flow._id] = flow;

    if (typeof callback === 'function') {
      callback(flow);
    }
  }

  getFlows(callback) {
    if (typeof callback === 'function') {
      callback(this.flows);
    }

    return this.flows;
  }

  getFlowById(id) {
    return this.flows[id];
  }

  getFlowByName(name) {
    return this.getFlowById(name);
  }
}

module.exports = Xible;
