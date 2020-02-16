'use strict';

module.exports = (XIBLE, EXPRESS_APP) => {
  EXPRESS_APP.get('/api/validateFlowPermissions', (req, res) => {
    XIBLE.Flow
    .validatePermissions()
    .then((result) => {
      res.json(result);
    });
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
    res.sendFile(`${__dirname}/node_modules/xible-wrapper/dist/index.js`);
  });

  // expose chart.js to editor
  EXPRESS_APP.get('/js/Chart.min.js', (req, res) => {
    res.sendFile(`${__dirname}/node_modules/chart.js/dist/Chart.min.js`);
  });

  EXPRESS_APP.get('*', (req, res, next) => {
    // node editor content hosting
    // and node-routes
    if (
      /^\/api\/nodes\/[^/]+\/editor\//.test(req.path) ||
      /^\/api\/node-routes\/[^/]+\//.test(req.path)
    ) {
      next();
      return;
    }

    res.sendFile(`${__dirname}/editor/index.htm`);
  });
};
