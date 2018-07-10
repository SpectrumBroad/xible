'use strict';

module.exports = (NODE) => {
  const valuesIn = NODE.getInputByName('values');

  const falsyOut = NODE.getOutputByName('falsy');
  falsyOut.on('trigger', async (conn, state) => {
    const values = await valuesIn.getValues(state);

    return values.every(val => !val);
  });
};
