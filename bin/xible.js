#!/usr/bin/env node

/* eslint-disable no-throw-literal */

'use strict';

// windows: running "xible x" in this folder will invoke WSH, not node.
/* global WScript */
if (typeof WScript !== 'undefined') {
  WScript.echo(
    'xible does not work when run\n'
    + 'with the Windows Scripting Host\n\n'
    + "'cd' to a different directory,\n"
    + "or type 'node xible <args>'."
  );
  WScript.quit(1);
  return;
}

process.title = 'xible';

// start with debug logging enabled until we have a 'normal' way of logging
process.env.DEBUG = 'xible*';

const fs = require('fs');
const nopt = require('nopt');
const Xible = require('../index.js');

// option parsing
const knownOpts = {
  'flow-store-type': String,
  'connection-string': String,
  config: String,
  user: String,
  group: String,
  force: Boolean,
  'node-id': String,
  params: Array
};
const shortHands = {
  c: '--config',
  u: '--user',
  g: '--group',
  f: '--force'
};
const opts = nopt(knownOpts, shortHands);
const { remain } = opts.argv;
const context = remain.shift() || 'help';
const command = remain.shift();

// get a xible instance
const FLOW_STORE_TYPE = opts['flow-store-type'] || 'FileStore';
const CONFIG_PATH = opts.config || '~/.xible/config.json';
const CONNECTION_STRING = opts['connection-string'];
const xible = new Xible({
  flowStoreType: FLOW_STORE_TYPE,
  configPath: CONFIG_PATH,
  connectionString: CONNECTION_STRING
});

const {
  log,
  logError
} = require('./log');

let loadedNodes = false;
/**
* Loads all nodes.
*/
async function loadNodes() {
  if (loadedNodes) {
    return;
  }
  const nodesPath = xible.Config.getValue('nodes.path');
  if (!nodesPath) {
    throw new Error('need a "nodes.path" in the configuration to load the installed nodes from');
  }

  await Promise.all([
    xible.Node.initFromPath(`${__dirname}/../nodes`),
    xible.Node.initFromPath(xible.resolvePath(nodesPath))
  ]);
  loadedNodes = true;
}

/**
 * Returns the found node by the given nodeId,
 * or null if not found.
 * @param {String} nodeId
 * @returns {Promise<XIBLE.Node>}
 */
async function getNodeById(nodeId) {
  const flows = await getFlows();
  for (const flowId in flows) {
    const flow = flows[flowId];
    const node = flow.getNodeById(nodeId);
    if (node) {
      return node;
    }
  }
  return null;
}

let loadedFlows = false;
/**
* Loads all flows.
*/
async function loadFlows() {
  if (loadedFlows) {
    return;
  }
  let flowPath = xible.Config.getValue('flows.path');
  if (!flowPath) {
    throw 'no "flows.path" configured';
  }
  flowPath = xible.resolvePath(flowPath);
  await xible.Flow.initFromPath(flowPath);
  loadedFlows = true;
}

/**
* Returns a flow by the given id/name.
* Rejects if no flows.path is configured in the xible instance.
* @returns {Promise<XIBLE.Flow[]>}
*/
async function getFlows() {
  await loadFlows();
  return xible.getFlows();
}

/**
* Returns a flow by the given id/name.
* Rejects if no flows.path is configured in the xible instance.
* @returns {Promise<XIBLE.Flow>}
*/
async function getFlowById(flowId) {
  if (!flowId) {
    throw 'The flow name must be provided';
  }

  await loadFlows();
  return xible.getFlowById(flowId);
}

// cli contexts and commands
const cli = {
  flow: {
    async start(flowName) {
      const flow = getFlowById(flowName);
      if (!flow) {
        throw `Flow "${flowName}" does not exist`;
      }

      let params;
      if (opts.params) {
        try {
          params = JSON.parse(opts.params);
        } catch (err) {
          return Promise.reject('The provided parameters are not valid JSON');
        }
      }

      return xible.CliQueue.add({
        method: 'flow.start',
        flowName,
        params
      });
    },
    async stop(flowName) {
      const flow = getFlowById(flowName);
      if (!flow) {
        throw `Flow "${flowName}" does not exist`;
      }

      return xible.CliQueue.add({
        method: 'flow.stop',
        flowName
      });
    },
    async delete(flowName) {
      if (!opts.force) {
        throw 'Are you sure you want to delete this flow? Provide --force to confirm.';
      }

      const flow = getFlowById(flowName);
      if (!flow) {
        throw `Flow "${flowName}" does not exist`;
      }

      return xible.CliQueue.add({
        method: 'flow.delete',
        flowName
      });
    }
  },

  node: {
    async set(arg, value) {
      const nodeId = opts['node-id'];
      if (!nodeId) {
        throw 'A --node-id argument needs to be specified';
      }

      if (!arg) {
        throw 'Please specify what property to set';
      }

      // assignment using equals sign
      if (value === undefined) {
        if (arg.includes('=')) {
          const argSplit = arg.split('=');
          arg = argSplit.shift();
          value = argSplit.join('=');
        } else {
          value = '';
        }
      }

      // find out where nodeId resides
      const node = await getNodeById(nodeId);
      if (!node) {
        throw `No node found with node-id "${nodeId}"`;
      }
      await loadNodes();

      // get the node constructor to verify if the given arg/prop is vaulted
      const nodeConstr = xible.getNodeByName(node.name);
      if (!nodeConstr) {
        throw `No such node installed: "${node.name}"`;
      }

      // store the value in either the flow or vault
      const nodeVaultKeys = nodeConstr.vault;
      if (nodeVaultKeys && Array.isArray(nodeVaultKeys) && nodeVaultKeys.includes(arg)) {
        await node.vault.set(Object.assign((await node.vault.get()) || {}, {
          [arg]: value
        }));
      } else {
        node.data[arg] = value;

        // save the flow
        node.flow.save();
      }
    },
    async delete(arg) {
      const nodeId = opts['node-id'];
      if (!nodeId) {
        throw 'A --node-id argument needs to be specified';
      }

      if (!arg) {
        throw 'Please specify what to delete.';
      }

      // find out where nodeId resides
      const node = await getNodeById(nodeId);
      if (!node) {
        throw `No node found with node-id "${nodeId}"`;
      }
      await loadNodes();

      // get the node constructor to verify if the given arg/prop is vaulted
      const nodeConstr = xible.getNodeByName(node.name);
      if (!nodeConstr) {
        throw `No such node installed: "${node.name}"`;
      }

      // delete the value from either the flow or vault
      const nodeVaultKeys = nodeConstr.vault;
      if (nodeVaultKeys && Array.isArray(nodeVaultKeys) && nodeVaultKeys.includes(arg)) {
        const vaultObj = (await node.vault.get()) || {};
        delete vaultObj[arg];
        await node.vault.set(vaultObj);
      } else {
        delete node.data[arg];

        // save the flow
        await node.flow.save();
      }
    },
    async get(arg) {
      const nodeId = opts['node-id'];
      if (!nodeId) {
        throw 'A --node-id argument needs to be specified';
      }

      if (!arg) {
        throw 'Please specify what to get.';
      }

      // find out where nodeId resides
      const node = await getNodeById(nodeId);
      if (!node) {
        throw `No node found with node-id "${nodeId}"`;
      }
      await loadNodes();

      // get the node constructor to verify if the given arg/prop is vaulted
      const nodeConstr = xible.getNodeByName(node.name);
      if (!nodeConstr) {
        throw `No such node installed: "${node.name}"`;
      }

      // get the value from either the flow or vault
      let dataValue = '';
      const nodeVaultKeys = nodeConstr.vault;
      if (nodeVaultKeys && Array.isArray(nodeVaultKeys) && nodeVaultKeys.includes(arg)) {
        dataValue = ((await node.vault.get()) || {})[arg];
      } else {
        dataValue = node.data[arg];
      }

      if (dataValue === undefined || dataValue === null) {
        dataValue = '';
      }
      log(dataValue);
    }
  },

  service: {
    // TODO: support windows
    install() {
      return new Promise((resolve, reject) => {
        fs.readFile(`${__dirname}/../xible.service`, 'utf8', (err, xibleServiceContents) => {
          if (err) {
            reject(`Failed to install service: ${err}`);
            return;
          }

          const user = opts.user || process.env.SUDO_USER || process.env.USER || 'root';
          const group = opts.group || opts.user || process.env.SUDO_USER || process.env.USER || 'root';

          // set the user and group for the service
          xibleServiceContents = xibleServiceContents.replace(/\$user/g, user);
          xibleServiceContents = xibleServiceContents.replace(/\$group/g, group);

          // save the service
          fs.writeFile('/etc/systemd/system/xible.service', xibleServiceContents, (writeServiceErr) => {
            if (writeServiceErr) {
              reject(`Failed to install service: ${writeServiceErr}`);
              return;
            }
            log(`Service installed with User="${user}" and Group="${group}".`);
            resolve();
          });
        });
      });
    },
    remove() {
      return new Promise((resolve, reject) => {
        fs.unlink('/etc/systemd/system/xible.service', (err) => {
          if (err) {
            reject(`Failed to remove service: ${err}`);
            return;
          }
          log('Service removed.');
          resolve();
        });
      });
    },
    start() {
      return new Promise((resolve, reject) => {
        const { exec } = require('child_process');
        exec('systemctl start xible.service', (err) => {
          if (err) {
            reject(`Failed to start service: ${err}`);
            return;
          }
          log('Service started.');
          resolve();
        });
      });
    },
    stop() {
      return new Promise((resolve, reject) => {
        const { exec } = require('child_process');
        exec('systemctl stop xible.service', (err) => {
          if (err) {
            reject(`Failed to stop service: ${err}`);
            return;
          }
          log('Service stopped.');
          resolve();
        });
      });
    },
    restart() {
      return new Promise((resolve, reject) => {
        const { exec } = require('child_process');
        exec('systemctl restart xible.service', (err) => {
          if (err) {
            reject(`Failed to restart service: ${err}`);
            return;
          }
          log('Service restarted.');
          resolve();
        });
      });
    },
    status() {
      return new Promise((resolve) => {
        const { exec } = require('child_process');
        exec('systemctl show xible.service -p ActiveState', (err, stdout) => {
          if (err) {
            log(`Failed to get service status: ${err}`);
            return;
          }
          stdout = `${stdout}`;
          if (/=inactive/.test(stdout)) {
            log('inactive');
          } else if (/=active/.test(stdout)) {
            log('active');
          } else {
            log('unknown');
          }
          resolve();
        });
      });
    },
    enable() {
      return this.install()
        .catch((err) => Promise.reject(`Failed to enable service: ${err}`))
        .then(() => new Promise((resolve, reject) => {
          const { exec } = require('child_process');
          exec('systemctl enable xible.service', (err) => {
            if (err) {
              reject(`Failed to enable service: ${err}`);
              return;
            }
            log('Service enabled. XIBLE will now automatically start at boot.');
            resolve();
          });
        }));
    },
    disable() {
      return new Promise((resolve, reject) => {
        const { exec } = require('child_process');
        exec('systemctl disable xible.service', (err) => {
          if (err) {
            reject(`Failed to disable service: ${err}`);
            return;
          }
          log('Service disabled.');
          resolve();
        });
      });
    }
  },

  server: {
    start() {
      // init xible
      return xible.init();
    },
    stop() {
      return xible.CliQueue.add({
        method: 'server.stop'
      });
    }
  },

  start() {
    return this.server.start();
  },
  stop() {
    return this.server.stop();
  }
};

cli.config = require('./config')(xible);

function printUsage(path) {
  if (context !== 'help') {
    if (cli[context] && !command) {
      logError('A command is required for this context\n');
    } else if (cli[context]) {
      logError(`Unrecognized command: "${command}"\n`);
    } else {
      logError(`Unrecognized context: "${context}"\n`);
    }
  }

  log(`Usage: xible ${cli[context] ? context : '<context>'} <command>\n\nWhere ${cli[context] ? '<command>' : '<context>'} is one of:\n\t${Object.keys(path).join(', ')}\n`);

  if (cli[context]) {
    log('Type: xible <context> help for more help about the specified context.');
  }
}

if (cli[context]) {
  if (!command && typeof cli[context] === 'function') {
    cli[context](...remain)
      .catch((err) => logError(err));
  } else if (command && typeof cli[context][command] === 'function') {
    cli[context][command](...remain)
      .catch((err) => logError(err));
  } else {
    printUsage(cli[context]);
  }
}

if (!cli[context]) {
  printUsage(cli);
}
