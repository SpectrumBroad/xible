'use strict';

const fs = require('fs');
const debug = require('debug')('xible:cliqueue');

module.exports = (XIBLE) => {
  let queueFileShouldExist = false;

  class CliQueue {
    /**
    * Inits and manages the queue file for remote CLI commands.
    */
    static init() {
      if (!XIBLE.configPath) {
        throw new Error('Cannot init PID file, configPath not set.');
      }

      // tracks where in the file we're at
      let queueLine = 0;

      // create/overwrite the queue file
      fs.writeFile(`${XIBLE.configPath}.queue`, '', {
        mode: 0o600
      }, (err) => {
        if (err) {
          throw err;
        }

        queueFileShouldExist = true;
        debug('Queue file created');
        fs.watch(`${XIBLE.configPath}.queue`, (type) => {
          if (!queueFileShouldExist) {
            return;
          }

          if (type !== 'change') {
            throw new Error('Queue file got renamed.');
          }

          // get the latest contents of the queue file
          fs.readFile(`${XIBLE.configPath}.queue`, {
            encoding: 'utf8'
          }, (readQueueErr, data) => {
            // handle errors reading the queue file
            if (readQueueErr) {
              debug(readQueueErr);
              return;
            }

            // ignore empty file changes
            if (!data) {
              return;
            }

            // process each line of the queue
            const dataLines = data.split('\n');
            for (let i = queueLine; i < dataLines.length; i += 1) {
              if (dataLines[i]) {
                queueLine += 1;
                try {
                  const obj = JSON.parse(dataLines[i]);

                  // get the flow if applicable
                  let flow;
                  if (obj.flowName) {
                    flow = XIBLE.getFlowByName(obj.flowName);
                    if (!flow) {
                      continue;
                    }
                  }

                  // handle the actual method
                  switch (obj.method) {
                    case 'flow.start':
                      flow.createInstance({ params: obj.params }).forceStart();
                      break;
                    case 'flow.stop':
                      flow.stopAllInstances();
                      break;
                    case 'flow.delete':
                      flow.delete();
                      break;
                    default:
                      debug(`Unhandled method "${obj.method}"`);
                      break;
                  }
                } catch (jsonParseErr) {
                  debug(jsonParseErr);
                }
              }
            }
          });
        });
      });
    }

    /**
    * Removes the queue file from path `${XIBLE.configPath}.queue`
    * This is a sync action as it can be called on process.exit
    */
    static removeFile() {
      if (!XIBLE.configPath) {
        throw new Error('Cannot remove queue file, configPath not set.');
      }

      queueFileShouldExist = false;

      try {
        fs.unlinkSync(`${XIBLE.configPath}.queue`);
        debug('Queue file removed');
      } catch (err) {
        // console.error(err);
      }
    }

    static add(str) {
      if (typeof str !== 'string') {
        str = JSON.stringify(str);
      }
      return new Promise((resolve, reject) => {
        fs.appendFile(`${XIBLE.configPath}.queue`, `${str}\n`, {
          mode: 0o600
        }, (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    }
  }

  return {
    CliQueue
  };
};
