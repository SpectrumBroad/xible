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
  return require(`${nodePath}/index.js`);
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

function passableError(err) {
  return {
    constructorName: err.constructor ? err.constructor.name : undefined,
    code: err.code,
    message: err.message,
    stack: err.stack
  };
}

// error handling
let errorTrapped = false;
async function onError(err) {
  if (flowInstance.listenerCount('error') && !errorTrapped) {
    errorTrapped = true;
    flowInstance.emit('error', err);
    return;
  }

  console.error(err);
  if (process.connected) {
    process.send({
      method: 'stop',
      error: passableError(err)
    });

    process.exit(1);
  } else if (flowInstance) {
    await flowInstance.stopChild(1);
  }
}

// always stop on unhandled promise rejections
process.on('unhandledRejection', onError);
process.on('uncaughtException', onError);

// init message handler
process.on('message', async (message) => {
  switch (message.method) {
    case 'init': {
      xible = new Xible({
        child: true
      }, message.config);

      try {
        initNodes(message.flow.nodes, message.nodes);

        await xible.init();

        // add the typedefs
        for (const typeDefName in message.typeDefs) {
          xible.TypeDef.add(message.typeDefs[typeDefName]);
        }

        flow = new xible.Flow();
        flow.initJson(message.flow);

        flowInstance = flow.createInstance();
        flowInstance._id = message.flowInstanceId;
      } catch (err) {
        console.error(err);
        process.send({
          method: 'initerr',
          error: passableError(err)
        });

        process.exit(1);
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
            error: passableError(err)
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
