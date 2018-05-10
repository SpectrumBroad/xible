'use strict';

module.exports = (NODE) => {
  const defaultIn = NODE.getInputByName('default');
  const valueOut = NODE.getOutputByName('value');

  let paramValue;

  NODE.on('init', () => {
    const flowInstanceParams = NODE.flowInstance.params;
    if (flowInstanceParams[NODE.data.paramName]) {
      paramValue = flowInstanceParams[NODE.data.paramName];
      valueOut.type = typeof paramValue;
    } else if (defaultIn.isConnected()) {
      valueOut.type = defaultIn.type;
    }
  });

  valueOut.on('trigger', async (conn, state) => {
    if (paramValue) {
      return paramValue;
    }

    const defaults = await defaultIn.getValues(state);
    const defaultValue = defaults.length ? defaults[0] : undefined;
    return defaultValue;
  });
};
