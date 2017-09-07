'use strict';

module.exports = (NODE) => {
  const objsIn = NODE.getInputByName('objects');

  const objsOut = NODE.getOutputByName('objects');
  objsOut.on('trigger', (conn, state, callback) => {
    const key = NODE.data.key;
    if (!key) {
      return;
    }
    objsIn.getValues(state)
    .then((objs) => {
      const values = objs
      .filter(obj => Object.prototype.hasOwnProperty.call(obj, key))
      .map(obj => obj[key]);

      callback(values);
    });
  });
};
