'use strict';

module.exports = (NODE) => {
  const triggerIn = NODE.getInputByName('trigger');

  triggerIn.on('trigger', (conn, state) => {
    process.send({
      method: 'stop'
    });
  });
};
