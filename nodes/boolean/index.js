'use strict';

module.exports = (NODE) => {
  const stringOut = NODE.getOutputByName('result');
  stringOut.on('trigger', async () => {
    return NODE.data.value === 'true';
  });
};
