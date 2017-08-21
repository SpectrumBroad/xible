'use strict';

module.exports = (NODE) => {
  const stringOut = NODE.getOutputByName('result');
  stringOut.on('trigger', (conn, state, callback) => {
    NODE.getInputByName('concat')
    .getValues(state)
    .then((strs) => {
      if (strs.length) {
        const concatStr = strs.reduce((prevVal, currentVal) => prevVal + currentVal);
        callback(concatStr + (NODE.data.value || ''));
      } else {
        callback(NODE.data.value || '');
      }
    });
  });
};
