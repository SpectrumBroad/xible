#!/usr/bin/env node

/* eslint-disable no-throw-literal */
/* eslint-disable no-await-in-loop */

'use strict';

// windows: running "xible x" in this folder will invoke WSH, not node.
/* global WScript*/
if (typeof WScript !== 'undefined') {
  WScript.echo(
    'xiblepm does not work when run\n' +
    'with the Windows Scripting Host\n\n' +
    "'cd' to a different directory,\n" +
    "or type 'node xiblepm <args>'."
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
const Xible = require('../index.js');
const Writable = require('stream').Writable;

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

// get a xible instance
const CONFIG_PATH = opts.config || '~/.xible/config.json';
const xible = new Xible({
  configPath: CONFIG_PATH
});

const {
  log,
  logError
} = require('./log');

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

class MutableWritable extends Writable {
  constructor(...args) {
    super(...args);
    this.muted = false;

    this.on('finish', () => {
      if (this.muted) {
        process.stdout.write('\n');
      }
    });
  }

  _write(chunk, encoding, callback) {
    if (!this.muted) {
      process.stdout.write(chunk, encoding);
    }
    callback();
  }
}

/**
 * Starts a command line prompt to get user input based based on a question.
 * @param {String} question The question to ask.
 * @param {Boolean} pwd Indicates whether the user input should be hidden on the command-line.
 * @returns {Promise.<String>} A promise with the input text provided by the user.
 */
function getUserInput(question, pwd) {
  return new Promise((resolve) => {
    const stdOut = new MutableWritable();

    const rl = readline.createInterface({
      input: process.stdin,
      output: stdOut,
      terminal: true
    });

    rl.question(question, (value) => {
      stdOut.destroy();
      rl.close();
      resolve(value);
    });

    if (pwd) {
      stdOut.muted = true;
    }
  });
}

// set the user token if there is one
const userToken = getUserToken();
if (userToken) {
  xible.Registry.setToken(userToken);
}

// cli context and commands
const cli = {
  flow: {
    publish(flowName) {
      if (!flowName) {
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
      xible.Flow.initFromPath(flowPath, true);
      const flow = xible.getFlowById(flowName);
      if (!flow) {
        return Promise.reject(`No such flow "${flowName}"`);
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
    install(flowName) {
      if (!flowName) {
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
      const flow = xible.getFlowById(altFlowId || flowName);

      // check if the flow already exists
      if (flow && !opts.force) {
        return Promise.reject('A flow already exists by this name. Provide --force to overwrite.');
      }

      return xible.Registry.Flow
      .getByName(flowName)
      .then((registryFlow) => {
        if (!registryFlow) {
          return Promise.reject(`Flow "${flowName}" does not exist`);
        }
        return registryFlow.install(altFlowId)
        .then(() => log(`Installed flow "${altFlowId || registryFlow.name}"`));
      });
    },
    search(str) {
      if (!str) {
        return Promise.reject('The search string must be provided');
      }

      return xible.Registry.Flow
      .search(str)
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
          resolve(
            xible.Registry.User
            .getByToken(token)
            .catch(getUserErr => Promise.reject(`Failed to get user from token: ${getUserErr}`))
            .then((user) => {
              if (!user) {
                return Promise.reject('User could not be verified. Please login using "xiblepm user login".');
              }

              // verify if this node had been published before
              return xible.Registry.NodePack
              .getByName(nodePackName)
              .catch(getNodePackErr => Promise.reject(`Failed to get nodepack from registry: ${getNodePackErr}`))
              .then((nodePack) => {
                // verify that whoami equals the remote user
                if (nodePack && nodePack.publishUserName !== user.name) {
                  return Promise.reject(`Nodepack "${nodePack.name}" was previously published by "${nodePack.publishUserName}". You are currently logged in as "${user.name}".`);
                }

                // publish
                return xible.Registry.NodePack
                .publish({
                  name: nodePackName,
                  registry: {
                    url: `https://registry.npmjs.com/${nodePackName}`
                  }
                })
                .then((publishedNodePack) => {
                  log(`Published nodepack "${publishedNodePack.name}".`);
                })
                .catch((publishErr) => {
                  if (publishErr.statusCode === 400 && publishErr.data) {
                    try {
                      publishErr = JSON.parse(publishErr.data).message;
                    } catch (jsonParseErr) {
                      // unable to get publish error
                    }
                  }
                  return Promise.reject(`Failed to publish nodepack "${nodePackName}": ${publishErr}`);
                });
              });
            })
          );
        });
      });
    },
    install(nodePackName) {
      if (!xible.Config.getValue('registry.nodepacks.allowinstall')) {
        return Promise.reject('Your config does not allow to install nodepacks from the registry');
      }

      if (!nodePackName) {
        return Promise.reject('The nodepack name must be provided');
      }

      return xible.Registry.NodePack
      .getByName(nodePackName)
      .then((nodePack) => {
        if (!nodePack) {
          return Promise.reject(`Nodepack "${nodePackName}" does not exist in the registry`);
        }
        return nodePack.install();
      });
    },
    async remove(nodePackName) {
      if (!nodePackName) {
        throw 'The nodepack name must be provided';
      }

      const nodePack = await xible.NodePack.getByName(nodePackName);
      if (!nodePack) {
        throw `Nodepack "${nodePackName}" is not installed`;
      }

      await nodePack.remove();
      log(`Nodepack "${nodePackName}" removed`);
    },
    async upgrade(nodePackName) {
      if (!nodePackName) {
        throw 'The nodepack name must be provided';
      }

      const nodePack = await xible.NodePack.getByName(nodePackName);
      if (nodePack) {
        nodePack.remove();
      }

      await this.install(nodePackName);
    },
    search(str) {
      if (!str) {
        return Promise.reject('The search string must be provided');
      }

      return xible.Registry.NodePack
      .search(str)
      .then((nodePacks) => {
        Object.keys(nodePacks)
        .forEach((nodePackName) => {
          nodePacks[nodePackName]
          .getRegistryData()
          .then((data) => {
            log(`${nodePackName}: ${data.description}: ${data['dist-tags'].latest}`);
          });
        });
      });
    }
  },

  me() {
    return this.user.whoami();
  },
  whoami() {
    return this.user.whoami();
  },
  logout() {
    return this.user.logout();
  },
  login() {
    return this.user.login();
  },
  register() {
    return this.user.add();
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
    register() {
      return this.add();
    },
    async add() {
      const newUser = new xible.Registry.User();

      let userNameCorrect = false;
      let userName;
      while (!userNameCorrect) {
        userName = await getUserInput('Enter your username: ');
        if (!userName) {
          console.error('You need to enter a username.');
        } else if (!/^[a-zA-Z0-9_-]{3,}$/.test(userName)) {
          console.error('Your username must be at least 3 characters long\n  and may only contain upper and lower case letters, numbers, an underscore and a dash.');
        } else {
          userNameCorrect = true;
        }
      }
      newUser.name = userName;

      let emailAddressCorrect = false;
      let emailAddress;
      while (!emailAddressCorrect) {
        emailAddress = await getUserInput('Enter your email address: ');
        if (!emailAddress) {
          console.error('You need to enter an email address.');
        } else if (!/^.+@.+\..+$/.test(emailAddress)) {
          console.error('You need to enter a valid email address.');
        } else {
          emailAddressCorrect = true;
        }
      }
      newUser.emailAddress = emailAddress;

      let passwordCorrect = false;
      let password;
      while (!passwordCorrect) {
        password = await getUserInput('Enter your password: ', true);
        if (!password) {
          console.error('You need to enter a password.');
        } else if (password.length < 7) {
          console.error('The password needs to be at least 7 characters long.');
        } else if (password.toLowerCase() === emailAddress.toLowerCase()) {
          console.error('The password may not equal the email address.');
        } else if (
          userName.toLowerCase().includes(password.toLowerCase()) ||
          password.toLowerCase().includes(userName.toLowerCase())
        ) {
          console.error('The password may not be a significant part of the username, or the other way around.');
        } else {
          passwordCorrect = true;
        }
      }
      newUser.password = password;

      const verifyPassword = await getUserInput('Verify your password: ', true);
      if (password !== verifyPassword) {
        throw 'Passwords do not match.';
      }

      const token = await xible.Registry.User.add(newUser);
      if (!token) {
        throw 'No token returned.';
      }

      return setUserToken(token);
    }
  }
};

cli.config = require('./config')(xible);

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
    cli[context](...remain)
    .catch(err => logError(err));
  } else if (command && typeof cli[context][command] === 'function') {
    cli[context][command](...remain)
    .catch(err => logError(err));
  } else {
    printUsage(cli[context]);
  }
}

if (!cli[context]) {
  printUsage(cli);
}
