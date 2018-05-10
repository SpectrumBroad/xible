'use strict';

module.exports = (NODE) => {
  const anyIn = NODE.getInputByName('any');

  const groupedOut = NODE.getOutputByName('grouped');
  groupedOut.on('trigger', async (conn, state) => {
    return anyIn.getValues(state);
  });

  const countOut = NODE.getOutputByName('count');
  countOut.on('trigger', async () => {
    return anyIn.connectors.length;
  });
};
