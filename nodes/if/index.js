'use strict';

module.exports = (NODE) => {
  const triggerIn = NODE.getInputByName('trigger');
  const conditionIn = NODE.getInputByName('condition');
  const thenOut = NODE.getOutputByName('then');
  const elseOut = NODE.getOutputByName('else');

  triggerIn.on('trigger', (conn, state) => {
    conditionIn.getValues(state).then((bools) => {
      if (bools.length) {
        if (bools.some(bool => !bool)) {
          elseOut.trigger(state);
        } else {
          thenOut.trigger(state);
        }
      } else {
        elseOut.trigger(state);
      }
    });
  });
};
