'use strict';

module.exports = (NODE) => {
  const defaultIn = NODE.getInputByName('default');
  const valueOut = NODE.getOutputByName('value');

  valueOut.on('trigger', async (conn, state, callback) => {
    if (NODE.flow.params[NODE.data.paramName]) {
      callback(NODE.flow.params[NODE.data.paramName]);
      return;
    }

    const defaults = await defaultIn.getValues(state);
    const defaultValue = defaults.length ? defaults[0] : undefined;
    callback(defaultValue);
  });
};
