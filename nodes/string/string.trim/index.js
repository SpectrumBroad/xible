'use strict';

module.exports = (NODE) => {
  const stringsIn = NODE.getInputByName('strings');

  const resultOut = NODE.getOutputByName('result');
  resultOut.on('trigger', async (conn, state) => {
    const strs = await stringsIn.getValues(state);
    let result = '';
    for (let i = 0; i < strs.length; i += 1) {
      const str = strs[i];
      if (typeof str === 'string') {
        result += str.trim();
      }
    }

    return result;
  });
};
