'use strict';

module.exports = (NODE) => {
  const docIn = NODE.getInputByName('document');

  const docOut = NODE.getOutputByName('document');
  docOut.on('trigger', (conn, state, callback) => {
    const key = NODE.data.key;
    if (!key) {
      return;
    }
    docIn.getValues(state)
    .then((docs) => {
      const values = docs
      .filter(doc => Object.prototype.hasOwnProperty.call(doc, key))
      .map(doc => doc[key]);
      callback(values);
    });
  });

  NODE.on('init', () => {
    NODE.addStatus({
      message: '"document" and "document.*" nodes are deprecated. Use "object.*" instead.',
      color: 'red'
    });
  });
};
