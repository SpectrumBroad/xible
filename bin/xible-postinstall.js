#!/usr/bin/env node

/* eslint-disable no-throw-literal */
/* eslint-disable no-await-in-loop */

'use strict';

// windows: running "xible x" in this folder will invoke WSH, not node.
/* global WScript*/
if (typeof WScript !== 'undefined') {
  WScript.echo(
    'xible-postinstall does not work when run\n' +
    'with the Windows Scripting Host\n\n' +
    "'cd' to a different directory,\n" +
    "or type 'node xible-postinstall <args>'."
  );
  WScript.quit(1);
  return;
}

process.title = 'xible postinstall';

const nopt = require('nopt');
const Xible = require('../index.js');

const {
  log,
  logError
} = require('./log');

// option parsing
const knownOpts = {
  config: String,
  registry: String
};
const shortHands = {
  c: '--config'
};
const opts = nopt(knownOpts, shortHands);

const configTmp = {};
if (opts.registry) {
  configTmp.registry = {
    url: opts.registry
  };
}

// get a xible instance
const CONFIG_PATH = opts.config || '~/.xible/config.json';
const xible = new Xible({
  configPath: CONFIG_PATH,
  configTmp
});

(async () => {
  try {
    if (!xible.Config.getValue('registry.nodepacks.allowinstall')) {
      throw new Error('Your config does not allow to install nodepacks from the registry');
    }

    // list of nodePack names to install in a default installation.
    const nodePackNames = [
      'xible',
      'core',
      'compare',
      'console',
      'input',
      'object',
      'string',
      'math',
      'stream',
      'filesystem',
      'process',
      'timing'
    ];

    for (const nodePackName of nodePackNames) {
      try {
        const nodePack = await xible.Registry.NodePack.getByName(nodePackName);
        if (!nodePack) {
          throw new Error(`Nodepack "${nodePackName}" does not exist in the registry`);
        } else {
          await nodePack.install(`${__dirname}/../nodes`);
          log(`Nodepack "${nodePackName}"@${nodePack.version} installed`);
        }
      } catch (installErr) {
        log(`Nodepack "${nodePackName}" failed to install. ${installErr}`);
      }
    }
  } catch (err) {
    logError(err);
  }

  log('XIBLE postinstall complete');
})();
