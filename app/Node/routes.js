'use strict';

module.exports = (NODE, XIBLE, EXPRESS_APP) => {
  // get all registered nodes
  EXPRESS_APP.get('/api/nodes', (req, res) => {
    let nodes = {};
    for (const nodeName in XIBLE.nodes) {
      nodes[nodeName] = new NODE(XIBLE.nodes[nodeName]);
    }

    res.json(nodes);
    nodes = null;
  });

  // get a node by a given id
  EXPRESS_APP.param('nodeName', (req, res, next, nodeName) => {
    const node = XIBLE.getNodeByName(nodeName);

    if (!node) {
      res.status(404).end();
      return;
    }

    req.locals.node = new NODE(node);
    next();
  });

  EXPRESS_APP.get('/api/nodes/:nodeName', (req, res) => {
    res.json(req.locals.node);
  });
};
