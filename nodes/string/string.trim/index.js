'use strict';

module.exports = (NODE) => {
  const stringIn = NODE.getInputByName('string');

  const resultOut = NODE.getOutputByName('result');
  resultOut.on('trigger', (conn, state, callback) => {
    stringIn.getValues(state).then((strs) => {
      let result = '';
      for (let i = 0; i < strs.length; i += 1) {
        const str = strs[i];
        if (typeof str === 'string') {
          result += str.trim();
        }
      }

      callback(result);
    });
  });
};
