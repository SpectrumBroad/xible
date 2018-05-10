'use strict';

function templateStringParser(str, vars) {
  return str.replace(/(^|(?:\\\\)+|\\.|[^\\])\$\{(\w*?)\}/g, (match, pre, varName) => {
    const foundVar = vars.find(v => v.name === varName);
    return pre + (foundVar && foundVar.values.length
      ? foundVar.values.reduce((prevVal, currentVal) => prevVal + currentVal)
      : `\${${varName}}`);
  }).replace(/\\(.)/g, (match, first) => first);
}

module.exports = (NODE) => {
  const stringOut = NODE.getOutputByName('result');
  const varsIn = NODE.getInputByName('variables');
  stringOut.on('trigger', async (conn, state) => {
    const vars = await varsIn.getValues(state);
    return templateStringParser(NODE.data.value || '', vars);
  });
};
