'use strict';

module.exports = (NODE) => {
  const versionsOut = NODE.getOutputByName('versions');

  versionsOut.on('trigger', (conn, state, callback) => {
    const packageJson = require('../../../package.json');
    callback(
      Object.assign({
        xible: packageJson.version
      },
      process.versions)
    );
  });
};
