'use strict';

module.exports = (NODE) => {
  const valuesIn = NODE.getInputByName('values');

  const boolOut = NODE.getOutputByName('result');
  boolOut.on('trigger', async (conn, state, callback) => {
    const values = await valuesIn.getValues(state);
    if (values.length) {
      const firstValue = values[0];
      callback(values.every(value => value === firstValue));
    } else {
      callback(false);
    }
  });
};
