'use strict';

module.exports = (NODE) => {
  const anyIn = NODE.getInputByName('any');

  const lengthOut = NODE.getOutputByName('length');
  lengthOut.on('trigger', async (conn, state) =>
    (await anyIn.getValues(state)).length
  );
};
