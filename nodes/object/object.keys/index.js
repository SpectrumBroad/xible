'use strict';

module.exports = (NODE) => {
  const objsIn = NODE.getInputByName('objects');

  const keysOut = NODE.getOutputByName('keys');
  keysOut.on('trigger', async (conn, state) => {
    const objs = await objsIn.getValues(state);
    return [].concat(...objs.map(obj => Object.keys(obj)));
  });
};
