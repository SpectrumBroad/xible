'use strict';

module.exports = (NODE) => {
  const targetIn = NODE.getInputByName('target');
  const sourcesIn = NODE.getInputByName('sources');

  const objOut = NODE.getOutputByName('object');
  objOut.on('trigger', async (conn, state) => {
    const [targets, sources] = await Promise.all([
      targetIn.getValues(state),
      sourcesIn.getValues(state)
    ]);
    return targets.map(target => Object.assign({}, target, ...sources));
  });
};
