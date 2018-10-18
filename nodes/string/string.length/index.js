'use strict';

module.exports = (NODE) => {
  const stringsIn = NODE.getInputByName('strings');

  const lengthOut = NODE.getOutputByName('length');
  lengthOut.on('trigger', async (conn, state) => {
    const strs = await stringsIn.getValues(state);
    return strs.reduce((acc, cur) => acc + cur.length, 0);
  });
};
