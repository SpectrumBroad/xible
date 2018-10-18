'use strict';

module.exports = (NODE) => {
  NODE.on('init', (state) => {
    NODE.flowInstance.on('error', (error) => {
      const errState = error.state || state;
      errState.set(NODE, {
        error
      });

      NODE.getOutputByName('trigger').trigger(errState);
    });
  });

  NODE.getOutputByName('error')
  .on('trigger', async (conn, state) => {
    const nodeState = state.get(NODE);
    const error = (nodeState && nodeState.error) || null;

    return error;
  });
};
