#!/usr/bin/env node

'use strict';

// windows: running "xible x" in this folder will invoke WSH, not node.
/* global WScript*/
if (typeof WScript !== 'undefined') {
  WScript.echo(
    'npm does not work when run\n' +
    'with the Windows Scripting Host\n\n' +
    "'cd' to a different directory,\n" +
    "or type 'npm.cmd <args>',\n" +
    "or type 'node npm <args>'."
  );
  WScript.quit(1);
  return;
}

process.title = 'xible package manager';

// basic requires
const os = require('os');
const fs = require('fs');
const url = require('url');
const readline = require('readline');
const nopt = require('nopt');
const stripAnsi = require('strip-ansi');
const Xible = require('./index.js');

// option parsing
const knownOpts = {
  config: String,
  altname: String,
  force: Boolean
};
const shortHands = {
  c: '--config',
  f: '--force'
};
const opts = nopt(knownOpts, shortHands);
const remain = opts.argv.remain;
const context = remain.shift() || 'help';
const command = remain.shift();
const ARG = remain.shift();

// get a xible instance
const CONFIG_PATH = opts.config || '~/.xible/config.json';
const xible = new Xible({
  configPath: CONFIG_PATH
});

function logError(msg, exitCode) {
  console.error(stripAnsi(msg));
  process.exitCode = exitCode || 1;
}

function log(msg) {
  console.log(stripAnsi(msg));
}

// determine the stripped registry url
function getStrippedRegistryUrl() {
  const registryUrl = xible.Config.getValue('registry.url');
  const parsedRegistryUrl = url.parse(registryUrl);
  delete parsedRegistryUrl.protocol;
  delete parsedRegistryUrl.auth;
  delete parsedRegistryUrl.query;
  delete parsedRegistryUrl.search;
  delete parsedRegistryUrl.hash;
  return url.resolve(url.format(parsedRegistryUrl), '.');
}

function getUserToken() {
  const regUrl = getStrippedRegistryUrl();
  try {
    const rc = require(`${os.homedir()}/.xiblerc.json`);
    return rc[regUrl] && rc[regUrl].token;
  } catch (err) {
    return null;
  }
}

function setUserToken(token) {
  const regUrl = getStrippedRegistryUrl();
  let rc = {};
  try {
    rc = require(`${os.homedir()}/.xiblerc.json`);
  } catch (err) {
    // doesn't exist
  }

  if (!rc[regUrl]) {
    rc[regUrl] = {};
  }
  rc[regUrl].token = token;

  fs.writeFileSync(`${os.homedir()}/.xiblerc.json`, JSON.stringify(rc, null, '\t'));
}

function getUserInput(question, pwd) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    if (pwd) {
      const stdin = process.openStdin();
      process.stdin.on('data', (char) => {
        const charStr = `${char}`;
        switch (charStr) {
          case '\n':
          case '\r':
          case '\u0004':
            stdin.pause();
            break;
          default:
            process.stdout.write(`\u001b[2K\u001b[200D${question}`);
            break;
        }
      });
    }

    rl.question(question, (value) => {
      rl.close();
      resolve(value);
    });
  });
}

// set the user token if there is one
const userToken = getUserToken();
if (userToken) {
  xible.Registry.setToken(userToken);
}

// cli commands
const cli = {

  flow: {
    publish() {
      if (!ARG) {
        return Promise.reject('The flow name must be provided');
      }

      if (!xible.Config.getValue('registry.flows.allowpublish')) {
        return Promise.reject('Your config does not allow to publish flows to the registry');
      }

      let flowPath = xible.Config.getValue('flows.path');
      if (!flowPath) {
        return Promise.reject('no "flows.path" configured');
      }
      flowPath = xible.resolvePath(flowPath);
      xible.Flow.initFromPath(flowPath);
      const flow = xible.getFlowById(ARG);
      if (!flow) {
        return Promise.reject(`No such flow "${ARG}"`);
      }

      let flowJson = flow.json;
      const altFlowId = opts.altname;
      if (altFlowId) {
        if (!xible.Flow.validateId(altFlowId)) {
          return Promise.reject('flow _id/name cannot contain reserved/unsave characters');
        }
        flowJson = Object.assign({}, flowJson);
        flowJson._id = altFlowId;
        flowJson.name = altFlowId;
      }

      // verify that we have a token
      const token = getUserToken();
      if (!token) {
        return Promise.reject('You are not logged in. Run "xiblepm user login" or "xiblepm user add" to create a new user.');
      }

      // verify that we're logged in
      return xible.Registry.User
        .getByToken(token)
        .catch(getUserErr => Promise.reject(`Failed to get user from token: ${getUserErr}`))
        .then((user) => {
          if (!user) {
            return Promise.reject('User could not be verified. Please login using "xiblepm user login".');
          }

          // verify if this node had been published before
          return xible.Registry.Flow
            .getByName(flow._id)
            .catch(getFlowErr => Promise.reject(`Failed to get flow from registry: ${getFlowErr}`))
            .then((registryFlow) => {
              // verify that whoami equals the remote user
              if (registryFlow && registryFlow.publishUserName !== user.name) {
                return Promise.reject(`Flow "${registryFlow._id}" was previously published by "${registryFlow.publishUserName}". You are currently logged in as "${user.name}".`);
              }

              // publish
              return xible.Registry.Flow
                .publish(flowJson)
                .catch(publishErr => Promise.reject(`Failed to publish flow "${flow._id}": ${publishErr}`))
                .then((publishedFlow) => {
                  log(`Published flow "${publishedFlow._id}".`);
                });
            });
        });
    },
    install() {
      if (!ARG) {
        return Promise.reject('The flow name must be provided');
      }

      if (!xible.Config.getValue('registry.flows.allowinstall')) {
        return Promise.reject('Your config does not allow to install flows from the registry');
      }

      const altFlowId = opts.altname;
      let flowPath = xible.Config.getValue('flows.path');
      if (!flowPath) {
        return Promise.reject('no "flows.path" configured');
      }
      flowPath = xible.resolvePath(flowPath);
      xible.Flow.initFromPath(flowPath);
      const flow = xible.getFlowById(altFlowId || ARG);

      // check if the flow already exists
      if (flow && !opts.force) {
        return Promise.reject('A flow already exists by this name. Provide --force to overwrite.');
      }

      return xible.Registry.Flow
        .getByName(ARG)
        .then((registryFlow) => {
          if (!registryFlow) {
            return Promise.reject(`Flow "${ARG}" does not exist`);
          }
          return registryFlow.install(altFlowId)
            .then(() => log(`Installed flow "${altFlowId || registryFlow.name}"`));
        });
    },
    remove() {
      if (!ARG) {
        return Promise.reject('The flow name must be provided');
      }

      let flowPath = xible.Config.getValue('flows.path');
      if (!flowPath) {
        return Promise.reject('no "flows.path" configured');
      }
      flowPath = xible.resolvePath(flowPath);
      xible.Flow.initFromPath(flowPath);
      const flow = xible.getFlowById(ARG);

      if (!flow) {
        return Promise.reject(`Flow "${ARG}" does not exist`);
      }
      return flow.delete()
        .then(() => log(`Flow "${ARG}" removed`));
    },
    search() {
      if (!ARG) {
        return Promise.reject('The search string must be provided');
      }

      return xible.Registry.Flow
        .search(ARG)
        .then((flows) => {
          Object.keys(flows).forEach((flowName) => {
            log(`${flowName}`);
          });
        });
    }
  },

  nodepack: {
    publish() {
      if (!xible.Config.getValue('registry.nodepacks.allowpublish')) {
        return Promise.reject('Your config does not allow to publish nodepacks to the registry');
      }

      // find package.json and use that name
      // let packageJson=require(`package.json`);
      return new Promise((resolve, reject) => {
        fs.readFile('package.json', (err, data) => {
          if (err) {
            reject(`Could not read "package.json": ${err}`);
            return;
          }

          // check that we have json
          let packageJson;
          try {
            packageJson = JSON.parse(data);
          } catch (parsePackageJsonErr) {
            reject(`Could not parse "package.json": ${parsePackageJsonErr}`);
            return;
          }

          // verify that we have a name
          const nodePackName = packageJson.name;
          if (!nodePackName) {
            reject('Could not locate "name" property in "package.json"');
            return;
          }

          // verify that we have a token
          const token = getUserToken();
          if (!token) {
            reject('You are not logged in. Run "xiblepm user login" or "xiblepm user add" to create a new user.');
            return;
          }

          // verify that we're logged in
          xible.Registry.User
            .getByToken(token)
            .catch(getUserErr => reject(`Failed to get user from token: ${getUserErr}`))
            .then((user) => {
              if (!user) {
                reject('User could not be verified. Please login using "xiblepm user login".');
                return;
              }

              // verify if this node had been published before
              xible.Registry.NodePack
                .getByName(nodePackName)
                .catch(getNodePackErr => reject(`Failed to get nodepack from registry: ${getNodePackErr}`))
                .then((nodePack) => {
                  // verify that whoami equals the remote user
                  if (nodePack && nodePack.publishUserName !== user.name) {
                    reject(`Nodepack "${nodePack.name}" was previously published by "${nodePack.publishUserName}". You are currently logged in as "${user.name}".`);
                    return;
                  }

                  // publish
                  xible.Registry.NodePack
                    .publish({
                      name: nodePackName,
                      registry: {
                        url: `https://registry.npmjs.com/${nodePackName}`
                      }
                    })
                    .catch(publishErr => reject(`Failed to publish nodepack "${nodePack.name}": ${publishErr}`))
                    .then((publishedNodePack) => {
                      log(`Published nodepack "${publishedNodePack.name}".`);
                      resolve();
                    });
                });
            });
        });
      });
    },
    install() {
      if (!xible.Config.getValue('registry.nodepacks.allowinstall')) {
        return Promise.reject('Your config does not allow to install nodepacks from the registry');
      }

      if (!ARG) {
        return Promise.reject('The nodepack name must be provided');
      }

      return xible.Registry.NodePack
        .getByName(ARG)
        .then((nodePack) => {
          if (!nodePack) {
            return Promise.reject(`Nodepack "${ARG}" does not exist`);
          }
          return nodePack.install();
        });
    },
    remove() {
      return Promise.reject('Not implemented yet');
    },
    search() {
      if (!ARG) {
        return Promise.reject('The search string must be provided');
      }

      return xible.Registry.NodePack
        .search(ARG)
        .then((nodes) => {
          Object.keys(nodes).forEach((nodeName) => {
            nodes[nodeName]
              .getRegistryData()
              .then((data) => {
                log(`${nodeName}: ${data.description}: ${data['dist-tags'].latest}`);
              });
          });
        });
    }
  },

  config: {
    set() {
      let value = remain.shift();
      if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      }

      xible.Config.setValue(ARG, value);
      return Promise.resolve();
    },
    delete() {
      xible.Config.deleteValue(ARG);
      return Promise.resolve();
    },
    get() {
      if (!ARG) {
        this.list();
        return Promise.resolve();
      }

      log(xible.Config.getValue(ARG));
      return Promise.resolve();
    },
    list() {
      log(JSON.stringify(xible.Config.getAll(), null, '\t'));
      return Promise.resolve();
    }
  },

  user: {
    me() {
      return this.whoami();
    },
    whoami() {
      const token = getUserToken();

      if (!token) {
        log('Not logged in.');
        return Promise.resolve();
      }

      return xible.Registry.User
        .getByToken(token)
        .then((user) => {
          if (!user) {
            log('Not logged in.');
            return;
          }
          log(user.name);
        });
    },
    logout() {
      setUserToken(null);
      return Promise.resolve();
    },
    login() {
      const user = new xible.Registry.User();

      return getUserInput('Enter your username: ')
        .then((userName) => {
          user.name = userName;
          return getUserInput('Enter your password: ', true);
        })
        .then((password) => {
          if (!password) {
            return Promise.reject('You need to enter a password.');
          }

          user.password = password;

          return user.getToken();
        })
        .then((token) => {
          if (!token) {
            return Promise.reject('No token returned.');
          }

          return setUserToken(token);
        });
    },
    add() {
      const newUser = new xible.Registry.User();

      return getUserInput('Enter your username: ')
        .then((userName) => {
          if (!userName) {
            return Promise.reject('You need a username.');
          } else if (!/^[a-zA-Z0-9_-]{3,}$/.test(userName)) {
            return Promise.reject('Your username may only contain upper and lower case letters, numbers, an underscore and a dash.\nIt must also be at least 3 characters long.');
          }

          newUser.name = userName;
          return getUserInput('Enter your email address: ');
        })
        .then((emailAddress) => {
          if (!emailAddress) {
            return Promise.reject('You need an email address.');
          } else if (!/^.+@.+\..+$/.test(emailAddress)) {
            return Promise.reject('You need a valid email address.');
          }

          newUser.emailAddress = emailAddress;
          return getUserInput('Enter your password: ', true);
        })
        .then((password) => {
          if (!password) {
            return Promise.reject('You need a password.');
          }

          newUser.password = password;
          return getUserInput('Verify your password: ', true);
        })
        .then((password) => {
          if (newUser.password !== password) {
            return Promise.reject('Passwords do not match.');
          }

          return xible.Registry.User
            .add(newUser)
            .then((token) => {
              if (!token) {
                return Promise.reject('No token returned.');
              }

              return setUserToken(token);
            });
        });
    }
  }

};

function printUsage(path) {
  if (context !== 'help') {
    if (cli[context]) {
      logError(`Unrecognized command: "${command}"\n`);
    } else {
      logError(`Unrecognized context: "${context}"\n`);
    }
  }

  log(`Usage: xiblepm ${cli[context] ? context : '<context>'} <command>\n\nWhere ${cli[context] ? '<command>' : '<context>'} is one of:\n\t${Object.keys(path).join(', ')}\n`);

  if (cli[context]) {
    log('Type: xiblepm <context> help for more help about the specified context.');
  }
}

if (cli[context]) {
  if (!command && typeof cli[context] === 'function') {
    cli[context]()
      .catch(err => logError(err));
  } else if (command && typeof cli[context][command] === 'function') {
    cli[context][command]()
      .catch(err => logError(err));
  } else {
    printUsage(cli[context]);
  }
}

if (!cli[context]) {
  printUsage(cli);
}
