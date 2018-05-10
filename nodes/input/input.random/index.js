'use strict';

module.exports = (NODE) => {
  const anyIn = NODE.getInputByName('any');

  const anyOut = NODE.getOutputByName('random');
  anyOut.on('trigger', async (conn, state) => {
    const objs = await anyIn.getValues(state);
    if (!objs.length) {
      return;
    }

    return objs[Math.floor(Math.random() * objs.length)];
  });
};
