'use strict';

module.exports = (NODE) => {
  const concatIn = NODE.getInputByName('concat');
  const stringOut = NODE.getOutputByName('result');
  stringOut.on('trigger', async (conn, state) => {
    const strs = await concatIn.getValues(state);

    if (!strs.length) {
      return NODE.data.value || '';
    }

    const concatStr = strs.reduce((prevVal, currentVal) => prevVal + currentVal);
    return concatStr + (NODE.data.value || '');
  });
};
