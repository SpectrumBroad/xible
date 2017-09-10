'use strict';

module.exports = (NODE) => {
  const anyIn = NODE.getInputByName('any');
  const conditionIn = NODE.getInputByName('condition');

  const filteredOut = NODE.getOutputByName('filtered');
  filteredOut.on('trigger', (conn, state, callback) => {
    if (!conditionIn.isConnected()) {
      return;
    }

    anyIn.getValues(state)
    .then((values) => {
      conditionIn.getValues(state)
      .then((conditions) => {
        if (!conditions.includes(false)) {
          callback(values);
        }
      });
    });
  });

  const droppedOut = NODE.getOutputByName('dropped');
  droppedOut.on('trigger', (conn, state, callback) => {
    anyIn.getValues(state)
    .then((values) => {
      conditionIn.getValues(state)
      .then((conditions) => {
        if (!conditions.includes(true)) {
          callback(values);
        }
      });
    });
  });
};
