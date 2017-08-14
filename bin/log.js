'use strict';

const stripAnsi = require('strip-ansi');

function logError(msg, exitCode) {
  console.error(stripAnsi(msg));
  process.exitCode = exitCode || 1;
}

function log(msg) {
  console.log(stripAnsi(msg));
}

module.exports = {
  log,
  logError
};
