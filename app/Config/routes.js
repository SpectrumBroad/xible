'use strict';

module.exports = (Config, XIBLE, EXPRESS_APP) => {
  EXPRESS_APP.get('/api/config', (req, res) => {
    res.json(Config.getAll());
  });

  EXPRESS_APP.put('/api/config/value', (req, res) => {
    const path = req.body.path;
    const value = req.body.value;
    if (typeof path !== 'string' || typeof value === 'undefined') {
      res.status(400).end();
      return;
    }

    Config.setValue(path, value);
    res.json(Config.getAll());
  });

  EXPRESS_APP.delete('/api/config/value', (req, res) => {
    const path = req.body.path;
    if (typeof path !== 'string') {
      res.status(400).end();
      return;
    }

    Config.deleteValue(path);
    res.json(Config.getAll());
  });

  EXPRESS_APP.get('/api/config/validatePermissions', (req, res) => {
    Config.validatePermissions().then((result) => {
      res.json(result);
    });
  });
};
