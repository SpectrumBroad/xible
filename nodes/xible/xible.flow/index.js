'use strict';

module.exports = (NODE) => {
  const flowOut = NODE.getOutputByName('flow');
  flowOut.on('trigger', (conn, state, callback) => {
    const flowId = NODE.data.flowName || NODE.flow.name;

    let messageHandler = (message) => {
      if (message.flowId !== flowId || message.method !== 'returnFlow') {
        return;
      }
      process.removeListener('message', messageHandler);
      messageHandler = null;

      callback(message.flow);
    };

    process.on('message', messageHandler);

    process.send({
      method: 'getFlowById',
      flowId
    });
  });
};
