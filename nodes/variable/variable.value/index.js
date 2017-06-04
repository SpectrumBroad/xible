'use strict';

module.exports = (NODE) => {
  const varIn = NODE.getInputByName('variable');
  const valueOut = NODE.getOutputByName('value');

  valueOut.on('trigger', (conn, state, callback) => {
    varIn.getValues(state).then((variables) => {
      callback([].concat(...variables.map(variable => variable.values)));
    });
  });
};
