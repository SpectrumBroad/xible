'use strict';

module.exports = (NODE) => {
  const anyIn = NODE.getInputByName('any');

  const anyOut = NODE.getOutputByName('random');
  anyOut.on('trigger', async (conn, state, callback) => {
    const objs = await anyIn.getValues(state);
    if (!objs.length) {
      return;
    }

    callback(objs[Math.floor(Math.random() * objs.length)]);
  });
};
