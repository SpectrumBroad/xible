'use strict';

const util = require('util');

function log(str, NODE) {
  console.error(str);

  if (typeof str !== 'string') {
    str = util.inspect(str);
  }

  NODE.addStatus({
    message: str,
    timeout: 3000,
    color: 'red'
  });
}

module.exports = (NODE) => {
  const triggerIn = NODE.getInputByName('trigger');
  const valueIn = NODE.getInputByName('value');

  const doneOut = NODE.getOutputByName('done');

  triggerIn.on('trigger', async (conn, state) => {
    if (!valueIn.isConnected()) {
      log(NODE.data.value || '', NODE);
      doneOut.trigger(state);
      return;
    }

    const strs = await valueIn.getValues(state)
    strs.forEach((str) => {
      log(str, NODE);
    });

    doneOut.trigger(state);
  });
};
