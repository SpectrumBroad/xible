'use strict';

module.exports = (NODE) => {
  const objsIn = NODE.getInputByName('objects');

  const stringOut = NODE.getOutputByName('json');
  stringOut.on('trigger', (conn, state, callback) => {
    objsIn
    .getValues(state)
    .then((objs) => {
      if (!objs.length) {
        callback(JSON.stringify(undefined));
      } else if (objs.length === 1) {
        callback(JSON.stringify(objs[0]));
      } else {
        callback(JSON.stringify(objs));
      }
    });
  });
};
