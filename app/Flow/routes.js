'use strict';

module.exports = (FLOW, XIBLE, EXPRESS_APP) => {
  // retrieve all flows
  EXPRESS_APP.get('/api/flows', (req, res) => {
    res.json(XIBLE.getFlows());
  });

  // create a new flow
  EXPRESS_APP.post('/api/flows', async (req, res) => {
    if (
      !req.body
      || !req.body._id
      || !Array.isArray(req.body.nodes)
      || !Array.isArray(req.body.connectors)
      || !FLOW.validateId(req.body._id)
      || XIBLE.getFlows()[req.body._id]
    ) {
      res.status(400).end();
      return;
    }

    try {
      const flow = new FLOW();
      flow.initJson(req.body, true);
      await flow.save();

      res.json({
        _id: flow._id
      });
    } catch (err) {
      res.status(500).end();
    }
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

  // get an existing flow
  EXPRESS_APP.get('/api/flows/:flowId', (req, res) => {
    const { flow } = req.locals;

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
  EXPRESS_APP.put('/api/flows/:flowId', async (req, res) => {
    if (!req.body) {
      res.status(400).end();
      return;
    }

    req.body._id = req.locals.flow._id;
    req.body.name = req.locals.flow.name;

    const { flow } = req.locals;
    await flow.stopAllInstances();

    // init the newly provided json over the existing flow
    try {
      flow.initJson(req.body, true);
    } catch (err) {
      console.error(err);
    }

    // save it to file
    await flow.save();

    // output the flow id
    res.json({
      _id: flow._id
    });
  });

  // delete an existing flow
  EXPRESS_APP.delete('/api/flows/:flowId', async (req, res) => {
    await req.locals.flow.delete();
    res.end();
  });

  // publish
  EXPRESS_APP.patch('/api/flows/:flowId/publish', async (req, res) => {
    let altName;
    if (req.body != null && req.body.altName != null) {
      altName = req.body.altName;
    }

    try {
      await req.locals.flow.publish(altName);
    } catch (err) {
      res.status(400).json(err).end();
    }

    res.end();
  });

  // stop all instances
  EXPRESS_APP.patch('/api/flows/:flowId/stop', async (req, res) => {
    await req.locals.flow.stopAllInstances();
    res.end();
  });

  // return all instances on a flow
  EXPRESS_APP.get('/api/flows/:flowId/instances', async (req, res) => {
    res.json(req.locals.flow.instances);
  });

  // create a new flowInstance
  EXPRESS_APP.post('/api/flows/:flowId/instances', async (req, res) => {
    const instance = req.locals.flow.createInstance({
      params: req.body.params,
      directNodes: req.body.directNodes
    });
    if (req.body.start === true) {
      await instance.forceStart();
    }
    res.json(instance);
  });

  // delete all flowInstances
  EXPRESS_APP.delete('/api/flows/:flowId/instances', async (req, res) => {
    await req.locals.flow.deleteAllInstances();
    res.end();
  });

  // get an instance by a given id
  EXPRESS_APP.param('flowInstanceId', (req, res, next, id) => {
    const flowInstance = req.locals.flow.getInstanceById(id);

    if (!flowInstance) {
      res.status(404).end();
      return;
    }

    req.locals.flowInstance = flowInstance;
    next();
  });

  EXPRESS_APP.delete('/api/flows/:flowId/instances/:flowInstanceId', async (req, res) => {
    try {
      await req.locals.flowInstance.delete();
      res.end();
    } catch (err) {
      console.error(err);
      res.status(500).end();
    }
  });

  // start a flowInstance
  EXPRESS_APP.patch('/api/flows/:flowId/instances/:flowInstanceId/start', async (req, res) => {
    try {
      await req.locals.flowInstance.forceStart();
      res.end();
    } catch (err) {
      console.error(err);
      res.status(500).end();
    }
  });

  // stop a flowInstance
  EXPRESS_APP.patch('/api/flows/:flowId/instances/:flowInstanceId/stop', async (req, res) => {
    try {
      await req.locals.flowInstance.forceStop(req.body.delete);
      res.end();
    } catch (err) {
      console.error(err);
      res.status(500).end();
    }
  });

  // run part of a flow directly
  EXPRESS_APP.patch('/api/flows/:flowId/instances/:flowInstanceId/direct', (req, res) => {
    req.locals.flowInstance.direct(req.body);
    res.end();
  });
};
