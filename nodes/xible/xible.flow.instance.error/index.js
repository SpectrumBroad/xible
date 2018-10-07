'use strict';

module.exports = (NODE) => {
  const triggerIn = NODE.getInputByName('trigger');
  triggerIn.on('trigger', (conn, state) => {
    throw new Error(NODE.data.errorMessage || 'unspecified');
  });
};
