'use strict';

module.exports = (NODE) => {
  const aIn = NODE.getInputByName('a');
  const bIn = NODE.getInputByName('b');

  const stringOut = NODE.getOutputByName('string');
  stringOut.on('trigger', async (conn, state) => {
    const [strsa, strsb] = await Promise.all([aIn.getValues(state), bIn.getValues(state)]);
    let result = '';
    if (strsa.length) {
      for (let i = 0; i < strsa.length; i += 1) {
        result += strsa[i];
      }
    }

    if (strsb.length) {
      for (let i = 0; i < strsb.length; i += 1) {
        result += strsb[i];
      }
    }

    return result;
  });
};
