'use strict';

module.exports = (NODE) => {
  const objIn = NODE.getInputByName('object');

  const keysOut = NODE.getOutputByName('keys');
  keysOut.on('trigger', (conn, state, callback) => {
    objIn.getValues(state)
    .then((objs) => {
      const objKeys = [].concat(...objs.map(obj => Object.keys(obj)));
      callback(objKeys);
    });
  });
};
