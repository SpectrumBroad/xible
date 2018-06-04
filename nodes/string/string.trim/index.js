'use strict';

module.exports = (NODE) => {
  const stringsIn = NODE.getInputByName('strings');

  const resultOut = NODE.getOutputByName('result');
  resultOut.on('trigger', async (conn, state) => {
    const strs = await stringsIn.getValues(state);
    return strs.map(str => str.trim())
  });
};
