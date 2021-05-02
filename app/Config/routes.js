'use strict';

module.exports = (Config, XIBLE, EXPRESS_APP) => {
  EXPRESS_APP.get('/api/config', (req, res) => {
    res.json(Config.getAll());
  });

  EXPRESS_APP.put('/api/config/value', (req, res) => {
    if (!Config.getValue('editor.settings.allowchange')) {
      res.status(403).end();
      return;
    }

    const { path } = req.body;
    const { value } = req.body;
    if (typeof path !== 'string' || typeof value === 'undefined') {
      res.status(400).end();
      return;
    }

    Config.setValue(path, value);
    res.json(Config.getAll());
  });

  EXPRESS_APP.delete('/api/config/value', (req, res) => {
    if (!Config.getValue('editor.settings.allowchange')) {
      res.status(403).end();
      return;
    }

    const { path } = req.body;
    if (typeof path !== 'string') {
      res.status(400).end();
      return;
    }

    Config.deleteValue(path);
    res.json(Config.getAll());
  });

  EXPRESS_APP.get('/api/config/validatePermissions', async (req, res) => {
    const result = await Config.validatePermissions();
    res.json(result);
  });
};
