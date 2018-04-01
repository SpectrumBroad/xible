'use strict';

const getFlowInstance = require('../utils.js').getFlowInstance;

module.exports = (NODE) => {
  const flowInstanceOut = NODE.getOutputByName('instance');
  flowInstanceOut.on('trigger', async (conn, state, callback) => {
    const flowInstance = await getFlowInstance(NODE.flow._id, NODE.flowInstance._id);
    if (!flowInstance) {
      return;
    }
    callback(flowInstance);
  });

  const stateOut = NODE.getOutputByName('state');
  stateOut.on('trigger', async (conn, state, callback) => {
    const flowInstance = await getFlowInstance(NODE.flow._id, NODE.flowInstance._id);
    if (!flowInstance) {
      return;
    }
    callback(flowInstance.state);
  });

  const timingOut = NODE.getOutputByName('timing');
  timingOut.on('trigger', async (conn, state, callback) => {
    const flowInstance = await getFlowInstance(NODE.flow._id, NODE.flowInstance._id);
    if (!flowInstance) {
      return;
    }
    callback(flowInstance.timing);
  });
};
