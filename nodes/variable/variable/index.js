'use strict';

module.exports = (NODE) => {
  const valuesIn = NODE.getInputByName('values');

  const variableOut = NODE.getOutputByName('variable');
  const valuesOut = NODE.getOutputByName('values');

  variableOut.on('trigger', async (conn, state) => {
    const values = await valuesIn.getValues(state);
    return {
      name: NODE.data.name,
      values
    };
  });

  valuesOut.on('trigger', async (conn, state) => {
    return valuesIn.getValues(state);
  });
};
