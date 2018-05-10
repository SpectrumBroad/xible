'use strict';

module.exports = (NODE) => {
  const varsIn = NODE.getInputByName('variables');
  const namesOut = NODE.getOutputByName('names');

  namesOut.on('trigger', async (conn, state, callback) => {
    const variables = await varsIn.getValues(state);
    callback([].concat(...variables.map(variable => variable.name)));
  });
};
