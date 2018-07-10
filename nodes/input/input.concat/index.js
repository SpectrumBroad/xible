'use strict';

module.exports = (NODE) => {
  const anyIn = NODE.getInputByName('any');

  const mergedOut = NODE.getOutputByName('merged');
  mergedOut.on('trigger', async (conn, state) => {
    return anyIn.getValues(state);
  });

  const countOut = NODE.getOutputByName('count');
  countOut.on('trigger', async () => {
    return anyIn.connectors.length;
  });
};
