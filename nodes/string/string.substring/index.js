'use strict';

module.exports = (NODE) => {
  const strsIn = NODE.getInputByName('strings');
  const strsOut = NODE.getOutputByName('strings');
  strsOut.on('trigger', async (conn, state) => {
    const strs = await strsIn.getValues(state);
    return strs.map(str => str.substring(NODE.data.indexStart, NODE.data.indexEnd || undefined));
  });
};
