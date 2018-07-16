'use strict';

module.exports = (NODE) => {
  const anyIn = NODE.getInputByName('any');
  const mappedIn = NODE.getInputByName('mapped');

  const mappedOut = NODE.getOutputByName('mapped');
  mappedOut.on('trigger', async (conn, state) => {
    if (!mappedIn.isConnected()) {
      return;
    }

    const values = await anyIn.getValues(state);
    const mappedValues = await Promise.all(values.map(async (value) => {
      const stateSplit = state.split();
      stateSplit.set(NODE, {
        value
      });

      return mappedIn.getValues(stateSplit);
    }));

    return [].concat(...mappedValues);
  });

  const itemOut = NODE.getOutputByName('item');
  itemOut.on('trigger', async (conn, state) => {
    const thisState = state.get(NODE);
    if (thisState && thisState.value !== undefined && thisState.value !== null) {
      return thisState.value;
    }
  });
};
