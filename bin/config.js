'use strict';

const {
  log
} = require('./log');

module.exports = XIBLE => (
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
    list() {
      log(JSON.stringify(XIBLE.Config.getAll(), null, '\t'));
      return Promise.resolve();
    }
  }
);
