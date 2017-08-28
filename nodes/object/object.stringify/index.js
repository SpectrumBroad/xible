'use strict';

module.exports = (NODE) => {
  const objIn = NODE.getInputByName('object');

  const stringOut = NODE.getOutputByName('json');
  stringOut.on('trigger', (conn, state, callback) => {
    objIn
    .getValues(state)
    .then((objs) => {
      callback(JSON.stringify(objs));
    });
  });
};
