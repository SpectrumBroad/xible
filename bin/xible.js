#!/usr/bin/env node

'use strict';

// windows: running "xible x" in this folder will invoke WSH, not node.
/* global WScript*/
if (typeof WScript !== 'undefined') {
  WScript.echo(
    'xible does not work when run\n' +
    'with the Windows Scripting Host\n\n' +
    "'cd' to a different directory,\n" +
    "or type 'node xible <args>'."
  );
  WScript.quit(1);
  return;
}

process.title = 'xible';

const fs = require('fs');
const nopt = require('nopt');
const Xible = require('../index.js');

// option parsing
const knownOpts = {
  config: String,
  user: String,
  group: String,
  force: Boolean
};
const shortHands = {
  c: '--config',
  u: '--user',
  g: '--group',
  f: '--force'
};
const opts = nopt(knownOpts, shortHands);
const remain = opts.argv.remain;
const context = remain.shift() || 'help';
const command = remain.shift();

// get a xible instance
const CONFIG_PATH = opts.config || '~/.xible/config.json';
const xible = new Xible({
  configPath: CONFIG_PATH
});

const {
  log,
  logError
} = require('./log');

/**
* Returns a flow by the given id/name.
* Rejects if no flows.path is configured in the xible instance.
* @returns {Promise.<XIBLE.Flow>}
*/
function getFlowById(flowId) {
  if (!flowId) {
    return Promise.reject('The flow name must be provided');
  }

  let flowPath = xible.Config.getValue('flows.path');
  if (!flowPath) {
    return Promise.reject('no "flows.path" configured');
  }
  flowPath = xible.resolvePath(flowPath);
  xible.Flow.initFromPath(flowPath);
  return Promise.resolve(xible.getFlowById(flowId));
}

// cli contexts and commands
const cli = {

  flow: {
    start(flowName) {
      return getFlowById(flowName)
      .then((flow) => {
        if (!flow) {
          return Promise.reject(`Flow "${flowName}" does not exist`);
        }

        return xible.CliQueue.add({
          method: 'flow.start',
          flowName
        });
      });
    },
    stop(flowName) {
      return getFlowById(flowName)
      .then((flow) => {
        if (!flow) {
          return Promise.reject(`Flow "${flowName}" does not exist`);
        }

        return xible.CliQueue.add({
          method: 'flow.stop',
          flowName
        });
      });
    },
    delete(flowName) {
      if (!opts.force) {
        return Promise.reject('Are you sure you want to delete this flow? Provide --force to confirm.');
      }

      return getFlowById(flowName)
      .then((flow) => {
        if (!flow) {
          return Promise.reject(`Flow "${flowName}" does not exist`);
        }

        return xible.CliQueue.add({
          method: 'flow.delete',
          flowName
        });
      });
    }
  },

  service: {
    // TODO: support windows
    install() {
      return new Promise((resolve, reject) => {
        fs.readFile(`${__dirname}/xible.service`, 'utf8', (err, xibleServiceContents) => {
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
        const exec = require('child_process').exec;
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
        const exec = require('child_process').exec;
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
    status() {
      return new Promise((resolve) => {
        const exec = require('child_process').exec;
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
      .catch(err => Promise.reject(`Failed to enable service: ${err}`))
      .then(() => new Promise((resolve, reject) => {
        const exec = require('child_process').exec;
        exec('systemctl enable xible.service', (err) => {
          if (err) {
            reject(`Failed to enable service: ${err}`);
            return;
          }
          log('Service enabled. Xible will now automatically start at boot.');
          resolve();
        });
      }));
    },
    disable() {
      return new Promise((resolve, reject) => {
        const exec = require('child_process').exec;
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
      // start with debug logging enabled until we have a 'normal' way of logging
      process.env.DEBUG = 'xible*';

      // init xible
      return xible.init();
    }
  },

  start() {
    return this.server.start();
  }

};

cli.config = require('./config')(xible);

function printUsage(path) {
  if (context !== 'help') {
    if (cli[context]) {
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
    .catch(err => logError(err));
  } else if (command && typeof cli[context][command] === 'function') {
    cli[context][command](...remain)
    .catch(err => logError(err));
  } else {
    printUsage(cli[context]);
  }
}

if (!cli[context]) {
  printUsage(cli);
}