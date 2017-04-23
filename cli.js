#!/usr/bin/env node

'use strict';

// windows: running "xible x" in this folder will invoke WSH, not node.
/* global WScript*/
if (typeof WScript !== 'undefined') {
  WScript.echo(
    'npm does not work when run\n' +
    'with the Windows Scripting Host\n\n' +
    "'cd' to a different directory,\n" +
    "or type 'npm.cmd <args>',\n" +
    "or type 'node npm <args>'."
  );
  WScript.quit(1);
  return;
}

process.title = 'xible';
console.log('XIBLE\n');

// start with debug logging enabled until we have a 'normal' way of logging
process.env.DEBUG = 'xible*';

const nopt = require('nopt');
const Xible = require('./index.js');

// option parsing
const knownOpts = {
  config: String
};
const shortHands = {
  c: '--config'
};
const opts = nopt(knownOpts, shortHands);
const remain = opts.argv.remain;
const context = remain.shift() || 'help';
const command = remain.shift();
const ARG = remain.shift();

// get a xible instance
const CONFIG_PATH = opts.config || '~/.xible/config.json';
const xible = new Xible({
  configPath: CONFIG_PATH
});

function logError(msg, exitCode) {
  console.error(msg);
  process.exitCode = exitCode || 1;
}

// cli commands
const cli = {

  flow: {

    start() {
      logError('Not implemented yet');
    },
    stop() {
      logError('Not implemented yet');
    }

  },

  server: {

    install() {
      // TODO: support windows

      const fs = require('fs-extra');
      fs.copySync(`${__dirname}/xible.service`, '/etc/systemd/system/xible.service');
    },
    enable() {
      // TODO: support windows

      this.install();
      const exec = require('child_process').exec;
      exec('systemctl enable xible.service', (err, stdout, stderr) => {
        if (err) {
          logError(`Failed to enable service: ${err}`);
          return;
        }

        if (stderr) {
          console.log(`${stderr}`);
        }
        console.log(`${stdout}`);
        console.log('Service enabled. Xible will now automatically start at boot.');
      });
    },
    disable() {
      // TODO: support windows

      const exec = require('child_process').exec;
      exec('systemctl disable xible.service', (err, stdout, stderr) => {
        if (err) {
          logError(`Failed to disable service: ${err}`);
          return;
        }

        if (stderr) {
          console.log(`${stderr}`);
        }
        console.log(`${stdout}`);
        console.log('Service disabled.');
      });
    },
    start() {
      xible.init();
    }

  }

};

function printUsage(path) {
  if (context !== 'help') {
    logError(`Unrecognized context: "${context}"\n`);
  }

  console.log(`Usage: xible ${cli[context] ? context : '<context>'} <command>\n\nWhere ${cli[context] ? '<command>' : '<context>'} is one of:\n\t${Object.keys(path).join(', ')}\n`);

  if (cli[context]) {
    console.log('Type: xible <context> help for more help about the specified context.');
  }
}

if (cli[context]) {
  if (!command && typeof cli[context] === 'function') {
    cli[context]();
  } else if (command && typeof cli[context][command] === 'function') {
    cli[context][command](opts);
  } else {
    printUsage(cli[context]);
  }
}

if (!cli[context]) {
  printUsage(cli);
}
