'use strict';

const getFlow = require('../utils.js').getFlow;

module.exports = (NODE) => {
  const flowOut = NODE.getOutputByName('flow');
  flowOut.on('trigger', async () => {
    const flowId = NODE.data.flowName || NODE.flow.name;
    const flow = await getFlow(flowId);
    return flow;
  });
};
