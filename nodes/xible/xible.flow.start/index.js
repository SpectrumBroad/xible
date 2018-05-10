'use strict';

const getFlowInstance = require('../utils.js').getFlowInstance;

module.exports = (NODE) => {
  const triggerIn = NODE.getInputByName('trigger');
  const flowsIn = NODE.getInputByName('flows');
  const paramsIn = NODE.getInputByName('params');
  const doneOut = NODE.getOutputByName('done');
  const instanceOut = NODE.getOutputByName('instance');

  triggerIn.on('trigger', async (conn, state) => {
    const flows = await flowsIn.getValues(state);
    let flowIds = flows.filter(flow => !!flow).map(flow => flow._id);
    if (!flowIds.length) {
      flowIds = [NODE.data.flowName || NODE.flow._id];
    }
    const flowIdCount = flowIds.length;
    let doneCount = 0;
    if (!flowIds.length) {
      return;
    }

    const params = Object.assign({}, ...await paramsIn.getValues(state));

    const flowInstanceDetails = [];
    flowIds.forEach((flowId) => {
      if (!flowId) {
        return;
      }

      let messageHandler = (message) => {
        if (message.flowId !== flowId) {
          return;
        }

        switch (message.method) {
          case 'flowStarted':
            flowInstanceDetails.push({
              flowId,
              flowInstanceId: message.flowInstanceId
            });
            if (++doneCount === flowIdCount) {
              state.set(NODE, {
                flowInstanceDetails
              });
              doneOut.trigger(state);
            }
            break;

          case 'flowNotExist':
            NODE.error(new Error(`flow "${flowId}" does not exist`), state);
            break;

          default:
            return;
        }

        process.removeListener('message', messageHandler);
        messageHandler = null;
      };

      process.on('message', messageHandler);
      process.send({
        method: 'xible.flow.start',
        flowId,
        params
      });
    });
  });

  instanceOut.on('trigger', async (conn, state) => {
    const thisState = state.get(NODE);
    if (!thisState || !thisState.flowInstanceDetails) {
      return;
    }

    const flowInstances = await Promise.all(
      thisState.flowInstanceDetails.map(
        flowInstanceDetail =>
          getFlowInstance(flowInstanceDetail.flowId, flowInstanceDetail.flowInstanceId)
      )
    );

    return flowInstances;
  });
};
