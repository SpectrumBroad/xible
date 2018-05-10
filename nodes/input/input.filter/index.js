'use strict';

module.exports = (NODE) => {
  const anyIn = NODE.getInputByName('any');
  const conditionIn = NODE.getInputByName('condition');

  const filteredOut = NODE.getOutputByName('filtered');
  filteredOut.on('trigger', async (conn, state) => {
    if (!conditionIn.isConnected()) {
      return;
    }

    const values = await anyIn.getValues(state);
    const filteredValues = await Promise.all(values.map(async (value) => {
      const stateSplit = state.split();
      stateSplit.set(NODE, {
        value
      });

      const conditions = await conditionIn.getValues(stateSplit);
      if (!conditions.includes(false)) {
        return value;
      }
      return null;
    }));
    return filteredValues.filter(value => value !== undefined && value !== null);
  });

  const itemOut = NODE.getOutputByName('item');
  itemOut.on('trigger', async (conn, state) => {
    const thisState = state.get(NODE);
    if (thisState && thisState.value !== undefined && thisState.value !== null) {
      return thisState.value;
    }
  });
};
