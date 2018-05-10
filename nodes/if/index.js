'use strict';

module.exports = (NODE) => {
  const triggerIn = NODE.getInputByName('trigger');
  const conditionIn = NODE.getInputByName('condition');
  const thenOut = NODE.getOutputByName('then');
  const elseOut = NODE.getOutputByName('else');

  triggerIn.on('trigger', async (conn, state) => {
    const bools = await conditionIn.getValues(state);
    if (!bools.length || bools.some(bool => !bool)) {
      elseOut.trigger(state);
    } else {
      thenOut.trigger(state);
    }
  });
};
