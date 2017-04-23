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
console.log('XIBLE PACKAGE MANAGER\n');

// basic requires
const os = require('os');
const fs = require('fs');
const url = require('url');
const readline = require('readline');
const nopt = require('nopt');
const Xible = require('./index.js');

// option parsing
const knownOpts = {
  config: String
};
const shortHands = {
  c: '--config'
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
  console.error(msg);
  process.exitCode = exitCode || 1;
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

// cli commands
const cli = {

  flow: {
    publish() {
      logError('Not implemented yet');
    },
    install() {
      logError('Not implemented yet');
    },
    remove() {
      logError('Not implemented yet');
    },
    search() {
      logError('Not implemented yet');
    }
  },

  nodepack: {
    publish() {
      if (!xible.Config.getValue('registry.nodepacks.allowpublish')) {
        logError('Your config does not allow to publish nodepacks to the registry');
        return;
      }

      // find package.json and use that name
      // let packageJson=require(`package.json`);
      fs.readFile('package.json', (err, data) => {
        if (err) {
          logError(`Could not read "package.json": ${err}`);
          return;
        }

        // check that we have json
        let packageJson;
        try {
          packageJson = JSON.parse(data);
        } catch (parsePackageJsonErr) {
          logError(`Could not parse "package.json": ${parsePackageJsonErr}`);
          return;
        }

        // verify that we have a name
        const nodePackName = packageJson.name;
        if (!nodePackName) {
          logError('Could not locate "name" property in "package.json"');
          return;
        }

        // verify that we have a token
        const token = getUserToken();

        if (!token) {
          logError('You are not logged in. Run "xiblepm user login" or "xiblepm user add" to create a new user.');
          return;
        }

        // verify that we're logged in
        xible.Registry.User
          .getByToken(token)
          .then((user) => {
            if (!user) {
              logError('User could not be verified. Please login using "xiblepm user login".');
              return;
            }

            // verify if this node had been published before
            xible.Registry.NodePack
              .getByName(nodePackName)
              .then((nodePack) => {
                // verify that whoami equals the remote user
                if (nodePack && nodePack.publishUserName !== user.name) {
                  logError(`Nodepack "${nodePack.name}" was previously published by "${nodePack.publishUserName}". You are currently logged in as "${user.name}".`);
                  return;
                }

                // publish
                xible.Registry.NodePack
                  .publish({
                    name: nodePackName,
                    registry: {
                      url: `https://registry.npmjs.com/${nodePackName}`
                    }
                  }, token)
                  .then((publishedNodePack) => {
                    console.log(`Published nodepack "${publishedNodePack.name}".`);
                  })
                  .catch(publishErr => logError(`Failed to publish nodepack "${nodePack.name}": ${publishErr}`));
              }).catch(getNodePackErr => logError(`Failed to get nodepack from registry: ${getNodePackErr}`));
          }).catch(getUserErr => logError(`Failed to get user from token: ${getUserErr}`));
      });
    },
    install() {
      if (!xible.Config.getValue('registry.nodepacks.allowinstall')) {
        logError('Your config does not allow to install nodepacks from the registry');
        return;
      }

      xible.Registry.NodePack
        .getByName(ARG)
        .then((nodePack) => {
          if (!nodePack) {
            return Promise.reject(`Nodepack "${ARG}" does not exist`);
          }
          return nodePack.install();
        })
        .catch(err => logError(err));
    },
    remove() {
      logError('Sorry: not implemented yet.');
    },
    search() {
      xible.Registry.NodePack
        .search(ARG)
        .then((nodes) => {
          Object.keys(nodes).forEach((nodeName) => {
            nodes[nodeName]
              .getRegistryData()
              .then((data) => {
                console.log(`${nodeName}: ${data.description}: ${data['dist-tags'].latest}`);
              });
          });
        })
        .catch(err => logError(err));
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
    },
    delete() {
      xible.Config.deleteValue(ARG);
    },
    get() {
      if (!ARG) {
        this.list();
        return;
      }

      console.log(xible.Config.getValue(ARG));
    },
    list() {
      console.log(JSON.stringify(xible.Config.getAll(), null, '\t'));
    }
  },

  user: {
    me() {
      this.whoami();
    },
    whoami() {
      const token = getUserToken();

      if (!token) {
        console.log('Not logged in.');
        return;
      }

      xible.Registry.User
        .getByToken(token)
        .then((user) => {
          if (!user) {
            console.log('Not logged in.');
            return;
          }
          console.log(user.name);
        })
        .catch(err => logError(err));
    },
    logout() {
      setUserToken(null);
    },
    login() {
      const user = new xible.Registry.User();

      getUserInput('Enter your username: ')
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

          setUserToken(token);
        })
        .catch(err => logError(err));
    },
    add() {
      const newUser = new xible.Registry.User();

      getUserInput('Enter your username: ')
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

              setUserToken(token);
            });
        })
        .catch(err => logError(err));
    }
  }

};

function printUsage(path) {
  if (context !== 'help') {
    logError(`Unrecognized context: "${context}"\n`);
  }

  console.log(`Usage: xiblepm ${cli[context] ? context : '<context>'} <command>\n\nWhere ${cli[context] ? '<command>' : '<context>'} is one of:\n\t${Object.keys(path).join(', ')}\n`);

  if (cli[context]) {
    console.log('Type: xiblepm <context> help for more help about the specified context.');
  }
}

if (cli[context]) {
  if (!command && typeof cli[context] === 'function') {
    cli[context]();
  } else if (command && typeof cli[context][command] === 'function') {
    cli[context][command](opts);
  } else {
    printUsage(cli[context]);
  }
}

if (!cli[context]) {
  printUsage(cli);
}
