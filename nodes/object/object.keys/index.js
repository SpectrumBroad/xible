'use strict';

module.exports = (NODE) => {
  const objsIn = NODE.getInputByName('objects');

  const keysOut = NODE.getOutputByName('keys');
  keysOut.on('trigger', (conn, state, callback) => {
    objsIn.getValues(state)
    .then((objs) => {
      const objKeys = [].concat(...objs.map(obj => Object.keys(obj)));
      callback(objKeys);
    });
  });
};
