'use strict';

module.exports = (NODE) => {
  const docIn = NODE.getInputByName('document');
  const variableIn = NODE.getInputByName('variable');

  const docOut = NODE.getOutputByName('document');
  docOut.on('trigger', (conn, state, callback) => {
    Promise.all([docIn.getValues(state), variableIn.getValues(state)]).then(([docs, variables]) => {
      const assignedDocs = docs.map((doc) => {
        // copy the document
        // FIXME: should merge deep
        const copyDoc = Object.assign({}, doc);

        // add/overwrite the new vars
        variables.forEach((variable) => {
          let val = variable.values;
          if (val.length === 1) {
            val = val[0];
          }

          copyDoc[variable.name] = val;
        });
        return copyDoc;
      });
      callback(assignedDocs);
    });
  });
};
