'use strict';

module.exports = (NODE) => {
  const objsIn = NODE.getInputByName('objects');

  const objsOut = NODE.getOutputByName('objects');
  objsOut.on('trigger', async (conn, state) => {
    const key = NODE.data.key;
    if (!key) {
      return;
    }
    const objs = await objsIn.getValues(state);
    return objs
    .filter(obj => Object.prototype.hasOwnProperty.call(obj, key))
    .map(obj => obj[key]);
  });
};
