'use strict';

module.exports = (NODE) => {
  const objIn = NODE.getInputByName('object');
  const variableIn = NODE.getInputByName('variable');

  const docOut = NODE.getOutputByName('document');
  docOut.on('trigger', (conn, state, callback) => {
    Promise.all([objIn.getValues(state), variableIn.getValues(state)])
    .then(([objs, variables]) => {
      const assignedObjs = objs.map((obj) => {
        // copy the document
        // FIXME: should merge deep
        const copyObj = Object.assign({}, obj);

        // add/overwrite the new vars
        variables.forEach((variable) => {
          let val = variable.values;
          if (val.length === 1) {
            val = val[0];
          }

          copyObj[variable.name] = val;
        });
        return copyObj;
      });
      callback(assignedObjs);
    });
  });
};
