'use strict';

module.exports = (NODE) => {
  const valuesIn = NODE.getInputByName('values');

  const truthyOut = NODE.getOutputByName('truthy');
  truthyOut.on('trigger', async (conn, state) => {
    const values = await valuesIn.getValues(state);

    return values.every(val => !!val);
  });
};
