'use strict';

module.exports = (NODE) => {
  const variablesIn = NODE.getInputByName('variables');

  const objOut = NODE.getOutputByName('object');
  objOut.on('trigger', (conn, state, callback) => {
    variablesIn
    .getValues(state)
    .then((variables) => {
      const obj = {};
      variables.forEach((variable) => {
        let val = variable.values;
        if (val.length === 1) {
          val = val[0];
        }

        obj[variable.name] = val;
      });

      callback(obj);
    });
  });
};
