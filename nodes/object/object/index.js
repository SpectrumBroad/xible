'use strict';

module.exports = (NODE) => {
  const variableIn = NODE.getInputByName('variable');

  const objOut = NODE.getOutputByName('object');
  objOut.on('trigger', (conn, state, callback) => {
    variableIn
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
