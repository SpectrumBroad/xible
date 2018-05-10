'use strict';

module.exports = (NODE) => {
  const conditionIn = NODE.getInputByName('condition');
  const trueIn = NODE.getInputByName('if true');
  const falseIn = NODE.getInputByName('if false');

  const valueOut = NODE.getOutputByName('value');
  valueOut.on('trigger', async (conn, state) => {
    const bools = await conditionIn.getValues(state);
    if (!bools.length) {
      return;
    }

    let input;
    if (bools.some(bool => !bool)) {
      input = falseIn;
    } else {
      input = trueIn;
    }

    return input.getValues(state);
  });
};
