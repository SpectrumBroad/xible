'use strict';

module.exports = (NODE) => {
  const docIn = NODE.getInputByName('document');

  const stringOut = NODE.getOutputByName('json');
  stringOut.on('trigger', (conn, state, callback) => {
    docIn.getValues(state)
    .then((docs) => {
      callback(JSON.stringify(docs));
    });
  });

  NODE.on('init', () => {
    NODE.addStatus({
      message: '"document" and "document.*" nodes are deprecated. Use "object.*" instead.',
      color: 'red'
    });
  });
};
