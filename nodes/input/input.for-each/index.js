'use strict';

module.exports = (NODE) => {
  const triggerIn = NODE.getInputByName('trigger');
  const anyIn = NODE.getInputByName('any');

  const triggerOut = NODE.getOutputByName('trigger');

  triggerIn.on('trigger', async (conn, state) => {
    const values = await anyIn.getValues(state);

    values.forEach((value) => {
      const thisState = state.split();
      thisState.set(NODE, {
        value
      });
      triggerOut.trigger(thisState);
    });
  });

  const itemOut = NODE.getOutputByName('item');
  itemOut.on('trigger', async (conn, state) => {
    const thisState = state.get(NODE);
    if (thisState && thisState.value !== undefined && thisState.value !== null) {
      return thisState.value;
    }
  });
};
