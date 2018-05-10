'use strict';

module.exports = (NODE) => {
  const valuesIn = NODE.getInputByName('values');

  const boolOut = NODE.getOutputByName('result');
  boolOut.on('trigger', async (conn, state) => {
    const values = await valuesIn.getValues(state);
    if (!values.length) {
      return false;
    }

    const firstValue = values[0];
    return values.every(value => value === firstValue);
  });
};
