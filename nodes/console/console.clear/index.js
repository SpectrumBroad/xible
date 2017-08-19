'use strict';

module.exports = (NODE) => {
  const triggerIn = NODE.getInputByName('trigger');
  const doneOut = NODE.getOutputByName('done');
  triggerIn.on('trigger', (conn, state) => {
    console.clear();
    doneOut.trigger(state);
  });
};
