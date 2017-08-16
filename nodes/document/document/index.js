'use strict';

module.exports = (NODE) => {
  const variableIn = NODE.getInputByName('variable');

  const docOut = NODE.getOutputByName('document');
  docOut.on('trigger', (conn, state, callback) => {
    variableIn.getValues(state).then((variables) => {
      const doc = {};
      variables.forEach((variable) => {
        let val = variable.values;
        if (val.length === 1) {
          val = val[0];
        }

        doc[variable.name] = val;
      });

      callback(doc);
    });
  });
};
