'use strict';

const EventEmitter = require('events').EventEmitter;
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

  constructor(obj, configObj) {
    super();

    this.nodes = {};
    this.flows = {};

    if (typeof obj.configPath === 'string') {
      this.configPath = this.resolvePath(obj.configPath);
    }

    this.child = false;
    if (obj.child) {
      this.child = true;
    }

    if (!this.child) {
      xibleDebug(process.versions);
    }

    this.secure = false;
    this.webPort = null;

    let appNames;
    if (this.child) {
      appNames = ['Config', 'Flow', 'Node'];
    } else {
      this.initWeb();
      this.persistentWebSocketMessages = {};
      appNames = ['Config', 'Flow', 'Node', 'Registry'];
    }

    for (let i = 0; i < appNames.length; i += 1) {
      Object.assign(this, require(`./app/${appNames[i]}`)(this, this.expressApp, (appNames[i] === 'Config' && configObj ? configObj : undefined)));
    }
  }

  /**
  * Creates a PID file in path `${this.configPath}.pid`
  */
  writePidFile() {
    if (!this.configPath) {
      throw new Error('Cannot write PID file, configPath not set.');
    }
    fs.writeFile(`${this.configPath}.pid`, process.pid, {
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
    fs.unlinkSync(`${this.configPath}.pid`);
    xibleDebug('PID file removed');
  }

  /**
  * Removes the queue file from path `${this.configPath}.queue`
  * This is a sync action as it can be called on process.exit
  */
  removeQueueFile() {
    if (!this.configPath) {
      throw new Error('Cannot remove queue file, configPath not set.');
    }
    fs.unlinkSync(`${this.configPath}.queue`);
    xibleDebug('Queue file removed');
  }

  static addQueueFile(configPath, str) {
    if (typeof str !== 'string') {
      str = JSON.stringify(str);
    }
    return new Promise((resolve, reject) => {
      fs.appendFile(`${this.resolvePath(configPath)}.queue`, `${str}\n`, {
        mode: 0o600
      }, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  /**
  * Inits and manages the queue file for remote CLI commands.
  */
  initQueueFile() {
    if (!this.configPath) {
      throw new Error('Cannot remove PID file, configPath not set.');
    }

    // tracks where in the file we're at
    let queueLine = 0;

    // create/overwrite the queue file
    fs.writeFile(`${this.configPath}.queue`, '', {
      mode: 0o600
    }, (err) => {
      if (err) {
        throw err;
      }
      xibleDebug('Queue file created');
      fs.watch(`${this.configPath}.queue`, (type) => {
        if (type !== 'change') {
          throw new Error('Queue file got renamed.');
        }

        // get the latest contents of the queue file
        fs.readFile(`${this.configPath}.queue`, {
          encoding: 'utf8'
        }, (readQueueErr, data) => {
          // handle errors reading the queue file
          if (readQueueErr) {
            xibleDebug(readQueueErr);
            return;
          }

          // ignore empty file changes
          if (!data) {
            return;
          }

          // process each line of the queue
          const dataLines = data.split('\n');
          for (let i = queueLine; i < dataLines.length; i += 1) {
            if (dataLines[i]) {
              queueLine += 1;
              try {
                const obj = JSON.parse(dataLines[i]);

                // get the flow if applicable
                let flow;
                if (obj.flowName) {
                  flow = this.getFlowByName(obj.flowName);
                  if (!flow) {
                    continue;
                  }
                }

                // handle the actual method
                switch (obj.method) {
                  case 'flow.start':
                    flow.forceStart();
                    break;
                  case 'flow.stop':
                    flow.forceStop();
                    break;
                  case 'flow.delete':
                    flow.forceStop()
                    .then(() => flow.delete());
                    break;
                  default:
                    xibleDebug(`Unhandled method "${obj.method}"`);
                    break;
                }
              } catch (jsonParseErr) {
                xibleDebug(jsonParseErr);
              }
            }
          }
        });
      });
    });
  }

  // load nodes and flows
  init(obj) {
    xibleDebug('init');

    // get all installed nodes
    const nodesPath = this.Config.getValue('nodes.path');
    if (!nodesPath) {
      throw new Error('need a "nodes.path" in the configuration to load the installed nodes from');
    }

    this.initStats();

    if (this.child) {
      return Promise.resolve();
    }

    // write PID file
    this.writePidFile();
    this.initQueueFile();
    process.on('SIGINT', () => {
      process.exit(1);
    });
    process.on('SIGTERM', () => {
      process.exit(1);
    });
    process.on('exit', () => {
      this.removeQueueFile();
      this.removePidFile();
      xibleDebug('exit');
    });

    this.startWeb();

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
      }, WEB_SOCKET_THROTTLE);
    }

    // ensure catch all routes are loaded last
    if (this.expressApp) {
      require('./routes.js')(this, this.expressApp);
    }

    return Promise.all([
      this.Node.initFromPath(`${__dirname}/nodes`),
      this.Node.initFromPath(this.resolvePath(nodesPath))
    ]).then(() => {
      // get all installed flows
      if (!obj || !obj.nodeNames) {
        const flowPath = this.Config.getValue('flows.path');
        if (flowPath) {
          this.Flow.init(this.resolvePath(flowPath));
        }
      }
    });
  }

  initStats() {
    if (!this.child) {
      // throttle broadcast flow stats every second
      setInterval(() => {
        const flows = this.getFlows();
        const flowsUsage = Object.keys(flows)
        .map(key => flows[key])
        .filter(flow => !!flow.usage)
        .map(flow => ({
          _id: flow._id,
          usage: flow.usage
        }));

        this.broadcastWebSocket({
          method: 'xible.flow.usage',
          flows: flowsUsage
        });
      }, STAT_INTERVAL);

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
                100 * ((cpuUsage.user + cpuUsage.system) / 1000) /
                (cpuTime[0] * 1000 + cpuTime[1] / 1e6)
              )
            },
            memory: process.memoryUsage(),
            delay: Math.round((cpuTime[0] * 1e9 + cpuTime[1] - STAT_INTERVAL * 1e6) / 1000)
          }
        });
      }
    }, STAT_INTERVAL);
  }

  static resolvePath(path) {
    return path.replace(/^~/, os.homedir());
  }

  resolvePath(path) { // eslint-disable-line
    return path.replace(/^~/, os.homedir());
  }

  static getNativeModules() {
    return Object.keys(process.binding('natives')).filter(el => !/^_|^internal|\//.test(el));
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

  startWeb() {
    xibleDebug('startWeb');

    // setup client requests over https
    const spdy = require('spdy');
    const expressApp = this.expressApp;

    // editor
    expressApp.use(this.express.static(`${__dirname}/editor`, {
      index: false
    }));

    // expose xibleWrapper to editor
    expressApp.get('/js/xibleWrapper.js', (req, res) => {
      res.sendFile(`${__dirname}/node_modules/xible-wrapper/dist/index.js`);
    });

    // init the webserver
    const webPortNumber = this.Config.getValue('webserver.portnumber') || 9600;
    this.webPortNumber = webPortNumber;
    expressDebug(`starting on port: ${webPortNumber}`);

    const onListen = (webServer) => {
      const address = webServer.address();
      const port = address.port;

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
    };

    // spdy (https)
    const webSslPortNumber = this.Config.getValue('webserver.ssl.portnumber') || 9601;
    const webSslKeyPath = this.Config.getValue('webserver.ssl.keypath');
    const webSslKeyCert = this.Config.getValue('webserver.ssl.certpath');
    if (webSslPortNumber && webSslKeyPath && webSslKeyCert) {
      expressDebug('starting spdy (https)');
      this.secure = true;

      const secureWebServer = spdy.createServer({
        key: fs.readFileSync(webSslKeyPath),
        cert: fs.readFileSync(webSslKeyCert)
      }, expressApp).listen(webSslPortNumber, () => onListen(secureWebServer));
    }

    expressDebug('starting plain (http)');
    const plainWebServer = expressApp.listen(webPortNumber, () => onListen(plainWebServer));
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
        res.redirect(`https://${req.host}:${this.webPort + 1}${req.originalUrl}`);
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
    if (!this.persistentWebSocketMessages[message.flowId]) {
      this.persistentWebSocketMessages[message.flowId] = {};
    }

    if (!this.persistentWebSocketMessages[message.flowId][message.nodeId]) {
      this.persistentWebSocketMessages[message.flowId][message.nodeId] = {};
    }

    this.persistentWebSocketMessages[message.flowId][message.nodeId][message.status._id] = message;
  }


  deletePersistentWebSocketMessage(message) {
    if (!this.persistentWebSocketMessages[message.flowId]) {
      return;
    }

    if (!this.persistentWebSocketMessages[message.flowId][message.nodeId]) {
      return;
    }

    delete this.persistentWebSocketMessages[message.flowId][message.nodeId][message.status._id];
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
            }, message.status.timeout);
          }

          break;

        case 'xible.node.updateProgressBarById':

          copyMessage = Object.assign({}, message);
          copyMessage.method = 'xible.node.addProgressBar';
          this.setPersistentWebSocketMessage(copyMessage);

          break;

        case 'xible.node.updateStatusById':

          copyMessage = Object.assign({}, message);
          copyMessage.method = 'xible.node.addStatus';
          this.setPersistentWebSocketMessage(copyMessage);

          break;

        case 'xible.node.removeStatusById':
          this.deletePersistentWebSocketMessage(message);
          break;

        case 'xible.node.removeAllStatuses':
          if (
            this.persistentWebSocketMessages[message.flowId] &&
            this.persistentWebSocketMessages[message.flowId][message.nodeId]
          ) {
            delete this.persistentWebSocketMessages[message.flowId][message.nodeId];
          }
          break;

        case 'xible.flow.removeAllStatuses':
          if (this.persistentWebSocketMessages[message.flowId]) {
            delete this.persistentWebSocketMessages[message.flowId];
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

  addNode(name, obj) {
    if (!name || !obj) {
      throw new Error('first argument needs to be string, second object');
    }

    // check if a similar node with the same name doesn't already exist
    if (this.nodes[name]) {
      return this.nodes[name];
    }

    if (!obj.name) {
      obj.name = name;
    }

    return (this.nodes[name] = obj);
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

  deleteFlow(flow, callback) {
    if (flow._id) {
      delete this.flows[flow._id];
    }

    if (typeof callback === 'function') {
      callback();
    }
  }

  deleteFlowById(id, callback) {
    if (id) {
      delete this.flows[id];
    }

    if (typeof callback === 'function') {
      callback();
    }
  }

}

module.exports = Xible;
