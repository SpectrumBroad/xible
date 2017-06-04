'use strict';

module.exports = (NODE) => {
  NODE.on('init', (state) => {
    NODE.flow.on('error', (error) => {
      const errState = error.state || state;
      errState.set(NODE, {
        error
      });

      NODE.getOutputByName('trigger').trigger(errState);
    });
  });

  NODE.getOutputByName('error').on('trigger', (conn, state, callback) => {
    const nodeState = state.get(NODE);
    const error = (nodeState && nodeState.error) || null;

    callback(error);
  });
};
