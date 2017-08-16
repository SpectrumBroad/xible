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
};
