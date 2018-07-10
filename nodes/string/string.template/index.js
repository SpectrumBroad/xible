'use strict';

function templateStringParser(str, vars) {
  return str.replace(/(^|(?:\\\\)+|\\.|[^\\])\$\{(\w*?)\}/g, (match, pre, varName) => {
    const foundVar = Object.prototype.hasOwnProperty.call(vars, varName);
    return pre + (foundVar
      ? vars[varName]
      : `\${${varName}}`);
  }).replace(/\\(.)/g, (match, first) => first);
}

module.exports = (NODE) => {
  const objsIn = NODE.getInputByName('objects');
  const varsIn = NODE.getInputByName('variables');

  const stringOut = NODE.getOutputByName('result');
  stringOut.on('trigger', async (conn, state) => {
    const [objs, vars] = await Promise.all([objsIn.getValues(state), varsIn.getValues(state)]);

    // build key-value pairs from the variables
    const varObj = {};
    for (let i = 0; i < vars.length; i += 1) {
      varObj[vars[i].name] = vars[i].values.reduce((prevVal, currentVal) => prevVal + currentVal);
    }

    const endVars = Object.assign({}, varObj, ...objs);
    return templateStringParser(NODE.data.value || '', endVars);
  });
};
