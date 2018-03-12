'use strict';

function getFlowInstance(flowId, flowInstanceId) {
  return new Promise((resolve) => {
    let messageHandler = (message) => {
      if (message.flowInstanceId !== flowInstanceId || message.method !== 'returnFlowInstance') {
        return;
      }
      process.removeListener('message', messageHandler);
      messageHandler = null;

      resolve(message.flowInstance);
    };

    process.on('message', messageHandler);

    process.send({
      method: 'xible.flow.instance.getById',
      flowId,
      flowInstanceId
    });
  });
}

function getFlow(flowId) {
  return new Promise((resolve) => {
    let messageHandler = (message) => {
      if (message.flowId !== flowId || message.method !== 'returnFlow') {
        return;
      }
      process.removeListener('message', messageHandler);
      messageHandler = null;

      resolve(message.flow);
    };

    process.on('message', messageHandler);

    process.send({
      method: 'xible.flow.getById',
      flowId
    });
  });
}

module.exports = {
  getFlowInstance,
  getFlow
};
