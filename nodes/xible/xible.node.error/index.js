'use strict';

module.exports = (NODE) => {
  const doneOut = NODE.getOutputByName('done');

  const triggerIn = NODE.getInputByName('trigger');
  triggerIn.on('trigger', (conn, state) => {
    const err = new Error(NODE.data.errorMessage || 'unspecified');
    conn.origin.node.error(err, state);

    doneOut.trigger(state);
  });
};
