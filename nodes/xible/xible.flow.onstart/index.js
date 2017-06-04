'use strict';

module.exports = (NODE) => {
  NODE.on('trigger', (state) => {
    NODE.getOutputByName('trigger').trigger(state);
  });
};
