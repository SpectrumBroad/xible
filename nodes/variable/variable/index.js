'use strict';

module.exports = (NODE) => {
  const valueIn = NODE.getInputByName('value');
  const variableOut = NODE.getOutputByName('variable');

  variableOut.on('trigger', (conn, state, callback) => {
    // perform a refresh of all inputs and return those values
    valueIn.getValues(state).then((vals) => {
      callback({
        name: NODE.data.name,
        values: vals
      });
    });
  });
};
