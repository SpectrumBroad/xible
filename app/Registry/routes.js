'use strict';

module.exports = (XIBLE_REGISTRY, XIBLE, EXPRESS_APP) => {
  // returns a list of online nodes
  EXPRESS_APP.get('/api/registry/nodepacks', (req, res) => {
    const searchString = req.query.search;
    if (!searchString) {
      XIBLE_REGISTRY.NodePack
      .getAll()
      .then((nodePacks) => {
        res.json(nodePacks);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).end();
      });

      return;
    }

    XIBLE_REGISTRY.NodePack
    .search(searchString)
    .then((nodePacks) => {
      res.json(nodePacks);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
  });

  // get a node by a given name
  EXPRESS_APP.param('regNodePackName', (req, res, next, nodePackName) => {
    req.locals.nodePackName = nodePackName;
    XIBLE_REGISTRY.NodePack
    .getByName(nodePackName)
    .then((nodePack) => {
      if (!nodePack) {
        res.status(404).end();
        return;
      }

      req.locals.nodePack = nodePack;
      next();
    })
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
  });

  EXPRESS_APP.get('/api/registry/nodepacks/:regNodePackName', (req, res) => {
    res.json(req.locals.nodePack);
  });

  // install a node
  EXPRESS_APP.patch('/api/registry/nodepacks/:regNodePackName/install', (req, res) => {
    req.locals.nodePack
    .install()
    .then(() => {
      res.end();
    })
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
  });
};
