'use strict';

module.exports = (NODE) => {
  const triggerIn = NODE.getInputByName('trigger');

  triggerIn.on('trigger', () => {
    process.send({
      method: 'xible.flow.instance.stop'
    });
  });
};
