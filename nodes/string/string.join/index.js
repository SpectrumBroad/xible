'use strict';

module.exports = (NODE) => {
  const strsIn = NODE.getInputByName('strings');

  const stringOut = NODE.getOutputByName('string');
  stringOut.on('trigger', async (conn, state) => {
    const strs = await strsIn.getValues(state);

    return strs.join(NODE.data.seperator);
  });
};
