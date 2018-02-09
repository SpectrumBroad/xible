'use strict';

const Xible = require('./index.js');

let flow;
let xible;

/**
* Requires the path to a Node.
* The try/catch prevents proper compilation by the v8 engine,
* therefore it is in a seperate function.
* @param {String} nodePath Path to the node directory where index.js resides.
* @returns {Function|null}
*/
function requireNode(nodePath) {
  try {
    return require(nodePath);
  } catch (err) {
    console.error(err);
    if (process.connected) {
      process.send({
        method: 'stop',
        error: err
      });
    }

    if (flow) {
      flow.stop();
    }

    return null;
  }
}

// always stop on unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error(reason);
  if (process.connected) {
    process.send({
      method: 'stop',
      error: reason
    });
  }

  if (flow) {
    flow.stop();
  }
});

// init message handler
process.on('message', (message) => {
  switch (message.method) {
    case 'init': {
      xible = new Xible({
        child: true
      }, message.config);

      // init the proper nodes
      let structuredNodes = new Set();
      const flowNodes = message.flow.nodes;
      let nodeName;
      for (let i = 0; i < flowNodes.length; i += 1) {
        nodeName = flowNodes[i].name;
        if (structuredNodes.has(nodeName)) {
          continue;
        }
        structuredNodes.add(nodeName);

        // require the actual node and check it was loaded properly
        const nodeConstr = message.nodes[nodeName];
        nodeConstr.constructorFunction = requireNode(nodeConstr.path);
        if (nodeConstr.constructorFunction) {
          xible.addNode(nodeConstr);
        }
      }
      structuredNodes = null;

      xible.init()
      .then(() => {
        flow = new xible.Flow();
        flow.initJson(message.flow);

        // inform the master that we initialized
        if (process.connected) {
          process.send({
            method: 'initialized'
          });
        }
      })
      .catch((err) => {
        console.error(err);

        if (process.connected) {
          process.send({
            method: 'stop',
            error: err
          });
        }

        if (flow) {
          flow.stop();
        }
      });

      break;
    }

    case 'start': {
      let startPromise;
      if (message.directNodes) {
        startPromise = flow.direct(message.directNodes);
      } else {
        startPromise = flow.start(message.params);
      }

      startPromise
      .then(() => {
        // inform the master that we actually started
        if (process.connected) {
          process.send({
            method: 'started'
          });
        }
      })
      .catch((err) => {
        console.error(err);

        if (process.connected) {
          process.send({
            method: 'stop',
            error: err
          });
        }

        if (flow) {
          flow.stop();
        }
      });

      break;
    }

    case 'stop': {
      if (flow) {
        flow.stop();
      }

      break;
    }

    case 'directNodes': {
      if (flow) {
        flow.direct(message.directNodes);
      }

      break;
    }
  }
});

// inform the master we have finished init
if (process.connected) {
  process.send({
    method: 'initializing'
  });
}
