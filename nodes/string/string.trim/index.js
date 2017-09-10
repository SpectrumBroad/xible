'use strict';

module.exports = (NODE) => {
  const stringsIn = NODE.getInputByName('strings');

  const resultOut = NODE.getOutputByName('result');
  resultOut.on('trigger', (conn, state, callback) => {
    stringsIn.getValues(state)
    .then((strs) => {
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
