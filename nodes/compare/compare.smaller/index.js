'use strict';

module.exports = (NODE) => {
  const aIn = NODE.getInputByName('a');
  const bIn = NODE.getInputByName('b');

  const boolOut = NODE.getOutputByName('result');
  boolOut.on('trigger', async (conn, state) => {
    const [as, bs] = await Promise.all([aIn.getValues(state), bIn.getValues(state)]);
    if (!as.length || !bs.length) {
      return false;
    }

    const minA = Math.min.apply(null, as);
    const maxB = Math.max.apply(null, bs);
    return minA < maxB;
  });
};
