'use strict';

module.exports = (NODE) => {
  const anyIn = NODE.getInputByName('any');

  const groupedOut = NODE.getOutputByName('grouped');
  groupedOut.on('trigger', (conn, state, callback) => {
    anyIn.getValues(state).then((vals) => {
      callback(vals);
    });
  });

  const countOut = NODE.getOutputByName('count');
  countOut.on('trigger', (conn, state, callback) => {
    callback(anyIn.connectors.length);
  });
};
