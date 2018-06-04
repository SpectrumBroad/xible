'use strict';

module.exports = (NODE) => {
  const variablesIn = NODE.getInputByName('variables');

  const objOut = NODE.getOutputByName('object');
  objOut.on('trigger', async (conn, state) => {
    const variables = await variablesIn.getValues(state);

    const json = NODE.data.json;
    let obj = {};
    if (json) {
      try {
        obj = JSON.parse(json);
      } catch (err) {
        NODE.error(err, state);
      }
    }

    variables.forEach((variable) => {
      let val = variable.values;
      if (val.length === 1) {
        val = val[0];
      }

      obj[variable.name] = val;
    });

    return obj;
  });
};
