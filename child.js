'use strict';

const Xible = require('./index.js');

let flow;
let flowInstance;
let xible;

// handle disconnects from master
process.on('disconnect', () => {
  if (flowInstance) {
    try {
      flowInstance.stopChild();
    } catch (err) {
      process.exit(0);
    }
  } else {
    process.exit(0);
  }
});

/**
* Requires the path to a Node.
* The try/catch prevents proper compilation by the v8 engine,
* therefore it is in a seperate function.
* @param {String} nodePath Path to the node directory where index.js resides.
* @returns {Function|null}
*/
function requireNode(nodePath) {
  try {
    return require(`${nodePath}/index.js`);
  } catch (err) {
    console.error(err);
    if (process.connected) {
      process.send({
        method: 'stop',
        error: err
      });
    } else if (flowInstance) {
      flowInstance.stopChild();
    }

    return null;
  }
}

function initNodes(flowNodes, nodes) {
  let structuredNodes = new Set();
  let nodeName;
  for (let i = 0; i < flowNodes.length; i += 1) {
    nodeName = flowNodes[i].name;
    if (structuredNodes.has(nodeName)) {
      continue;
    }
    structuredNodes.add(nodeName);

    // require the actual node and check it was loaded properly
    const nodeConstr = nodes[nodeName];
    nodeConstr.constructorFunction = requireNode(nodeConstr.path);
    if (nodeConstr.constructorFunction) {
      xible.addNode(nodeConstr);
    }
  }
  structuredNodes = null;
}

// always stop on unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error(reason);
  if (process.connected) {
    process.send({
      method: 'stop',
      error: reason
    });
  } else if (flowInstance) {
    flowInstance.stopChild();
  }
});

// init message handler
process.on('message', async (message) => {
  switch (message.method) {
    case 'init': {
      xible = new Xible({
        child: true
      }, message.config);

      initNodes(message.flow.nodes, message.nodes);

      try {
        await xible.init();

        flow = new xible.Flow();
        flow.initJson(message.flow);

        flowInstance = flow.createInstance();
        flowInstance._id = message.flowInstanceId;
      } catch (err) {
        console.error(err);

        process.send({
          method: 'initerr',
          error: err
        });

        process.exit(0);
      }

      // inform the master that we initialized
      if (process.connected) {
        process.send({
          method: 'initialized'
        });
      }

      break;
    }

    case 'start': {
      flowInstance.params = message.params || {};
      flowInstance.directNodes = message.directNodes;

      try {
        if (message.directNodes) {
          flowInstance.directed = true;
          await flowInstance.directChild(message.directNodes);
        } else {
          await flowInstance.startChild();
        }

        if (!flowInstance.directed) {
          process.channel.unref();
        }

        // inform the master that we actually started
        if (process.connected) {
          process.send({
            method: 'started'
          });
        }
      } catch (err) {
        console.error(err);

        if (process.connected) {
          process.send({
            method: 'stop',
            error: err
          });
        }

        if (flowInstance) {
          flowInstance.stopChild();
        }
      }

      break;
    }

    case 'stop': {
      if (flowInstance) {
        flowInstance.stopChild();
      }

      break;
    }

    case 'directNodes': {
      if (flowInstance) {
        flowInstance.directChild(message.directNodes);
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
