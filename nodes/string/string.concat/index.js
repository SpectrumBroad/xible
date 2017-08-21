'use strict';

module.exports = (NODE) => {
  const aIn = NODE.getInputByName('a');
  const bIn = NODE.getInputByName('b');

  const stringOut = NODE.getOutputByName('string');
  stringOut.on('trigger', (conn, state, callback) => {
    Promise.all([aIn.getValues(state), bIn.getValues(state)])
    .then(([strsa, strsb]) => {
      let result = '';
      if (strsa.length) {
        strsa.forEach((str) => {
          result += str;
        });
      }

      if (strsb.length) {
        strsb.forEach((str) => {
          result += str;
        });
      }

      callback(result);
    });
  });
};
