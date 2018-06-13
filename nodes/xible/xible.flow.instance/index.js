'use strict';

const getFlowInstance = require('../utils.js').getFlowInstance;

module.exports = (NODE) => {
  const flowInstanceOut = NODE.getOutputByName('instance');
  flowInstanceOut.on('trigger', async (conn, state) => {
    const flowInstance = await getFlowInstance(NODE.flow._id, NODE.flowInstance._id);
    if (!flowInstance) {
      return;
    }
    return flowInstance;
  });

  const stateOut = NODE.getOutputByName('state');
  stateOut.on('trigger', async (conn, state) => {
    const flowInstance = await getFlowInstance(NODE.flow._id, NODE.flowInstance._id);
    if (!flowInstance) {
      return;
    }
    return flowInstance.state;
  });

  const paramsOut = NODE.getOutputByName('params');
  paramsOut.on('trigger', async (conn, state) => {
    return NODE.flowInstance.params;
  });

  const timingOut = NODE.getOutputByName('timing');
  timingOut.on('trigger', async (conn, state) => {
    const flowInstance = await getFlowInstance(NODE.flow._id, NODE.flowInstance._id);
    if (!flowInstance) {
      return;
    }
    return flowInstance.timing;
  });
};
