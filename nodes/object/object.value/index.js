'use strict';

module.exports = (NODE) => {
  const objIn = NODE.getInputByName('object');

  const objOut = NODE.getOutputByName('object');
  objOut.on('trigger', (conn, state, callback) => {
    const key = NODE.data.key;
    if (!key) {
      return;
    }
    objIn.getValues(state)
    .then((objs) => {
      const values = objs
      .filter(obj => Object.prototype.hasOwnProperty.call(obj, key))
      .map(obj => obj[key]);

      callback(values);
    });
  });
};
