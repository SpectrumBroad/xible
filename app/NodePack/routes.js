'use strict';

module.exports = (NODE_PACK, XIBLE, EXPRESS_APP) => {
  // get all registered nodePacks
  EXPRESS_APP.get('/api/nodepacks', async (req, res) => {
    const nodePacks = await NODE_PACK.getAll();
    res.json(nodePacks);
  });

  // get a nodePack by given name
  EXPRESS_APP.param('nodePackName', async (req, res, next, name) => {
    const nodePack = await NODE_PACK.getByName(name);
    if (!nodePack) {
      res.status(404).end();
      return;
    }

    req.locals.nodePack = nodePack;
    next();
  });

  EXPRESS_APP.get('/api/nodes/:nodePackName', (req, res) => {
    res.json(req.locals.nodePack);
  });

  EXPRESS_APP.delete('/api/nodes/:nodePackName', async (req, res) => {
    await req.locals.nodePack.remove();
    res.json(req.locals.nodePack);
  });
};
