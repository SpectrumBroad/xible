'use strict';

module.exports = (NODE) => {
  const versionsOut = NODE.getOutputByName('versions');

  versionsOut.on('trigger', async (conn, state) => {
    const packageJson = require('../../../package.json');
    return Object.assign(
      {
        xible: packageJson.version
      },
      process.versions
    );
  });
};
