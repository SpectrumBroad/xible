'use strict';

module.exports = (NODE) => {
  const stringOut = NODE.getOutputByName('result');
  stringOut.on('trigger', (conn, state, callback) => {
    callback(NODE.data.value === 'true');
  });
};
