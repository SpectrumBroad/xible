'use strict';

module.exports = (NODE) => {
  const triggerIn = NODE.getInputByName('trigger');
  const objectsIn = NODE.getInputByName('objects');

  const triggerOut = NODE.getOutputByName('trigger');
  const groupedOut = NODE.getOutputByName('grouped');

  triggerIn.on('trigger', async (conn, state) => {
    const objs = await objectsIn.getValues(state);
    const key = NODE.data.key;

    const groupedObjs = {};
    for (let i = 0; i < objs.length; i += 1) {
      const val = objs[i][key];
      if (!groupedObjs[val]) {
        groupedObjs[val] = [objs[i]];
      } else {
        groupedObjs[val].push(objs[i]);
      }
    }

    for (const groupedKey in groupedObjs) {
      const groupedState = state.split();
      groupedState.set(NODE, {
        key: groupedKey,
        objs: groupedObjs[groupedKey]
      });
      triggerOut.trigger(groupedState);
    }
  });

  groupedOut.on('trigger', async (conn, state) => {
    const thisState = state.get(NODE);
    if (!thisState || !thisState.objs) {
      return;
    }

    return thisState.objs;
  });
};
