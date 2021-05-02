'use strict';

const {
  log
} = require('./log');

/**
 * Returns a given object as a human readable key value list.
 * @param {Object} obj
 * @returns {String[]}
 */
function configList(obj, pre) {
  let returnArr = [];
  pre = pre ? `${pre}.` : '';
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      returnArr.push(`${pre}${key} = "${obj[key].replace(/"/g, '\\"')}"`);
    } else if (typeof obj[key] !== 'object') {
      returnArr.push(`${pre}${key} = ${obj[key]}`);
    } else {
      returnArr = returnArr.concat(configList(obj[key], `${pre}${key}`));
    }
  }

  return returnArr;
}

module.exports = (XIBLE) => (
  {
    set(arg, value) {
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

      // boolean handling
      if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      }

      XIBLE.Config.setValue(arg, value);
      return Promise.resolve();
    },
    delete(arg) {
      XIBLE.Config.deleteValue(arg);
      return Promise.resolve();
    },
    get(arg) {
      if (!arg) {
        this.list();
        return Promise.resolve();
      }

      log(XIBLE.Config.getValue(arg));
      return Promise.resolve();
    },
    json() {
      log(JSON.stringify(XIBLE.Config.getAll(), null, '\t'));
      return Promise.resolve();
    },
    list() {
      log(configList(XIBLE.Config.getAll()).join('\n'));
      return Promise.resolve();
    }
  }
);
