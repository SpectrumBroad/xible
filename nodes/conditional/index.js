'use strict';

module.exports = (NODE) => {
  const conditionIn = NODE.getInputByName('condition');
  const trueIn = NODE.getInputByName('if true');
  const falseIn = NODE.getInputByName('if false');

  const valueOut = NODE.getOutputByName('value');
  valueOut.on('trigger', (conn, state, callback) => {
    conditionIn.getValues(state)
    .then((bools) => {
      if (bools.length) {
        let input;
        if (bools.some(bool => !bool)) {
          input = falseIn;
        } else {
          input = trueIn;
        }
        input.getValues(state)
        .then(values => callback(values));
      } else {
        callback(null);
      }
    });
  });
};
