'use strict';

module.exports = (NODE) => {
  const varsIn = NODE.getInputByName('variables');
  const valuesOut = NODE.getOutputByName('values');

  valuesOut.on('trigger', async (conn, state, callback) => {
    const variables = await varsIn.getValues(state);
    callback([].concat(...variables.map(variable => variable.values)));
  });
};
