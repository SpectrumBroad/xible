'use strict';

module.exports = (FLOW, XIBLE, EXPRESS_APP) => {
  // retrieve all flows
  EXPRESS_APP.get('/api/flows', (req, res) => {
    const flows = XIBLE.getFlows();
    const returnFlows = {};

    for (const id in flows) {
      const flow = flows[id];

      returnFlows[id] = {
        _id: id,
        name: id,
        nodes: flow.nodes,
        connectors: flow.json.connectors,
        viewState: flow.json.viewState,
        runnable: flow.runnable,
        directed: flow.directed,
        state: flow.state
      };
    }

    res.json(returnFlows);
  });


  // create a new flow
  EXPRESS_APP.post('/api/flows', (req, res) => {
    if (!req.body || !req.body._id) {
      res.status(400).end();
      return;
    }

    const flow = new FLOW();
    flow.initJson(req.body, true);
    flow.save();

    res.json({
      _id: flow._id
    });
  });


  // get a flow by a given id
  EXPRESS_APP.param('flowId', (req, res, next, id) => {
    const flow = XIBLE.getFlowById(id);

    if (!flow) {
      res.status(404).end();
      return;
    }

    req.locals.flow = flow;
    next();
  });


  // stop an existing flow
  EXPRESS_APP.patch('/api/flows/:flowId/stop', (req, res) => {
    req.locals.flow
    .forceStop()
    .then(() => {
      res.end();
    })
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
  });


  // start an existing flow
  EXPRESS_APP.patch('/api/flows/:flowId/start', (req, res) => {
    req.locals.flow
    .forceStart()
    .then(() => {
      res.end();
    })
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
  });


  // run part of a flow directly
  EXPRESS_APP.patch('/api/flows/:flowId/direct', (req, res) => {
    req.locals.flow.direct(req.body);
    res.end();
  });


  // run part of a flow directly
  EXPRESS_APP.patch('/api/flows/:flowId/undirect', (req, res) => {
    // get the nodes that are allowed to run
    req.locals.flow.undirect();

    // output the flow id
    res.end();
  });


  // get an existing flow
  EXPRESS_APP.get('/api/flows/:flowId', (req, res) => {
    const flow = req.locals.flow;

    const returnFlow = {
      _id: flow._id,
      name: flow._id,
      nodes: flow.nodes,
      connectors: flow.json.connectors,
      viewState: flow.json.viewState,
      runnable: flow.runnable,
      directed: flow.directed,
      state: flow.state
    };

    res.json(returnFlow);
  });


  // update an existing flow
  EXPRESS_APP.put('/api/flows/:flowId', (req, res) => {
    if (!req.body) {
      res.status(400).end();
      return;
    }

    const flow = req.locals.flow;
    flow
    .forceStop()
    .then(() => {
      // init the newly provided json over the existing flow
      flow.initJson(req.body, true);

      // save it to file
      flow
      .save()
      .then(() => {
        // output the flow id
        res.json({
          _id: flow._id
        });
      });
    });
  });


  // delete an existing flow
  EXPRESS_APP.delete('/api/flows/:flowId', (req, res) => {
    const flow = req.locals.flow;
    flow
    .forceStop()
    .then(() => flow.delete())
    .then(() => {
      res.end();
    });
  });
};
