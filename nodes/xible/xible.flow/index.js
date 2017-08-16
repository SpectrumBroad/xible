'use strict';

function getFlow(flowId, callback) {
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
}

module.exports = (NODE) => {
  const flowOut = NODE.getOutputByName('flow');
  flowOut.on('trigger', (conn, state, callback) => {
    const flowId = NODE.data.flowName || NODE.flow.name;
    getFlow(flowId, callback);
  });

  const timingOut = NODE.getOutputByName('timing');
  timingOut.on('trigger', (conn, state, callback) => {
    const flowId = NODE.data.flowName || NODE.flow.name;
    getFlow(flowId, (flow) => {
      if (!flow) {
        return;
      }
      callback(flow.timing);
    });
  });
};
