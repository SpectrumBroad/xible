'use strict';

module.exports = (NODE) => {
  const strsIn = NODE.getInputByName('strings');
  const strsOut = NODE.getOutputByName('padded strings');
  strsOut.on('trigger', async (conn, state) => {
    const strs = await strsIn.getValues(state);
    return strs.map(str => str.padEnd(NODE.data.targetLength || 0, NODE.data.padString || ' '));
  });
};
