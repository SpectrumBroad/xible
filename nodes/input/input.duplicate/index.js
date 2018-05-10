'use strict';

module.exports = (NODE) => {
  const anyIn = NODE.getInputByName('any');

  const duplicatesOut = NODE.getOutputByName('duplicates');
  duplicatesOut.on('trigger', async (conn, state) => {
    const objs = await anyIn.getValues(state);
    if (!objs.length) {
      return;
    }

    const duplicateAmount = +NODE.data.duplicateAmount;
    if (isNaN(duplicateAmount) || duplicateAmount < 1) {
      return;
    }

    if (duplicateAmount === 1) {
      return objs;
    }

    let newObjArray = objs;
    for (let i = 1; i < duplicateAmount; i += 1) {
      newObjArray = newObjArray.concat(objs);
    }

    return newObjArray;
  });
};
