'use strict';

module.exports = (NODE) => {
  const targetIn = NODE.getInputByName('target');
  const sourcesIn = NODE.getInputByName('sources');

  const objOut = NODE.getOutputByName('object');
  objOut.on('trigger', (conn, state, callback) => {
    Promise.all([targetIn.getValues(state), sourcesIn.getValues(state)])
    .then(([targets, sources]) => {
      let target = {};
      if (targets.length) {
        target = targets[0];
      }
      const assignedObj = Object.assign({}, target, ...sources);
      callback(assignedObj);
    });
  });
};
