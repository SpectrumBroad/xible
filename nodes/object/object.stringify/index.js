'use strict';

module.exports = (NODE) => {
  const objsIn = NODE.getInputByName('objects');

  const stringOut = NODE.getOutputByName('json');
  stringOut.on('trigger', async (conn, state) => {
    const objs = await objsIn.getValues(state);

    if (!objs.length) {
      return JSON.stringify(undefined);
    } else if (objs.length === 1) {
      return JSON.stringify(objs[0]);
    }

    return JSON.stringify(objs);
  });
};
