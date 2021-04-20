'use strict';

module.exports = (XIBLE, EXPRESS_APP) => {
  EXPRESS_APP.get('/api/validateFlowPermissions', async (req, res) => {
    const permissionsResult = await XIBLE.Flow.validatePermissions();
    res.json(permissionsResult);
  });

  EXPRESS_APP.get('/api/serverDate', (req, res) => {
    res.json(Date.now());
  });

  // send out any existing statuses
  EXPRESS_APP.get('/api/persistentWebSocketMessages', (req, res) => {
    res.json(XIBLE.persistentWebSocketMessages);
  });

  // non existing views
  EXPRESS_APP.get('/views/*.js', (req, res) => {
    res.status(404).end();
  });

  // expose xibleWrapper to editor
  EXPRESS_APP.get('/js/xibleWrapper.js', (req, res) => {
    res.sendFile(require.resolve('xible-wrapper/dist/index.js'));
  });

  // expose chart.js to editor
  EXPRESS_APP.get('/js/Chart.min.js', (req, res) => {
    res.sendFile(require.resolve('chart.js/dist/Chart.min.js'));
  });

  EXPRESS_APP.get('*', (req, res, next) => {
    // API hosting.
    if (
      /^\/api\//.test(req.path)
    ) {
      next();
      return;
    }

    res.sendFile(`${__dirname}/editor/index.htm`);
  });
};
