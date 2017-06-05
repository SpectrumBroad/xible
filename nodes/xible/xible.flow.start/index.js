'use strict';

module.exports = (NODE) => {
  const triggerIn = NODE.getInputByName('trigger');
  const flowIn = NODE.getInputByName('flow');
  const doneOut = NODE.getOutputByName('done');

  triggerIn.on('trigger', (conn, state) => {
    flowIn.getValues(state).then((flows) => {
      let flowIds = flows.filter(flow => !!flow).map(flow => flow._id);
      if (!flowIds.length) {
        flowIds = [NODE.data.flowName || NODE.flow._id];
      }
      const flowIdCount = flowIds.length;
      let doneCount = 0;
      if (!flowIds.length) {
        return;
      }

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
              if (++doneCount === flowIdCount) {
                doneOut.trigger(state);
              }
              break;

            case 'flowNotExist':
              NODE.addStatus({
                message: 'flow does not exist',
                color: 'red'
              });

              break;

            default:
              return;

          }

          process.removeListener('message', messageHandler);
          messageHandler = null;
        };

        process.on('message', messageHandler);
        process.send({
          method: 'startFlowById',
          flowId
        });
      });
    });
  });
};
