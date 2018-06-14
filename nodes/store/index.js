'use strict';

module.exports = (NODE) => {
  let used = false;
  let refreshing = false;
  let values;

  const refreshIn = NODE.getInputByName('refresh');
  const valueIn = NODE.getInputByName('value');

  const refreshOut = NODE.getOutputByName('refreshed');
  const valueOut = NODE.getOutputByName('value');

  refreshIn.on('trigger', (conn, state) => {
    // get the input values
    refreshing = true;
    valueIn.getValues(state).then((vals) => {
      used = true;
      refreshing = false;
      values = vals;

      // save the state
      state.set(NODE, {
        values: vals
      });

      refreshOut.trigger(state);
    });
  });

  valueOut.on('trigger', async (conn, state) => {
    // state handling (if refresh complete was used)
    const thisState = state.get(NODE);
    if (thisState) {
      return thisState.values;
    }

    // callback immeditialy if we already have this value(s) in store
    if (used) {
      return values;
    }

    // wait to callback when we're currently refreshing the value(s)
    if (refreshing) {
      return new Promise((resolve) => {
        NODE.once('refreshed', () => {
          resolve(values);
        });
      });
    }

    // perform a refresh of all inputs and return those values
    refreshing = true;
    values = await valueIn.getValues(state);
    used = true;
    refreshing = false;

    NODE.emit('refreshed');

    return values;
  });
};
