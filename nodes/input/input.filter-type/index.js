'use strict';

module.exports = (NODE) => {
  const anyIn = NODE.getInputByName('any');

  const filteredOut = NODE.getOutputByName('filtered');
  filteredOut.on('trigger', async (conn, state) => {
    return anyIn.getValues(state);
  });
};
