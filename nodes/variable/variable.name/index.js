'use strict';

module.exports = (NODE) => {
  const varIn = NODE.getInputByName('variable');
  const nameOut = NODE.getOutputByName('name');

  nameOut.on('trigger', (conn, state, callback) => {
    varIn.getValues(state).then((variables) => {
      callback([].concat(...variables.map(variable => variable.name)));
    });
  });
};
