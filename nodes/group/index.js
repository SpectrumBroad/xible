'use strict';

module.exports = (NODE) => {
  const anyIn = NODE.getInputByName('any');

  anyIn.on('attach', function (connector) {
    const type = connector.origin.type;
    this.node.getOutputByName('grouped').setType(type);
  });

  anyIn.on('detach', function (connector) {
    if (!this.connectors.length) {
      this.node.getOutputByName('grouped').setType(null);
    }
  });

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
