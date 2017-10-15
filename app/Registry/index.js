'use strict';

const XibleRegistryWrapper = require('xible-registry-wrapper');
const fsExtra = require('fs-extra');
const os = require('os');

module.exports = (XIBLE, EXPRESS_APP) => {
  const registryUrl = XIBLE.Config.getValue('registry.url');
  if (!registryUrl) {
    throw new Error('"registry.url" not found in config');
  }

  const xibleRegistry = new XibleRegistryWrapper(registryUrl);

  // the tmp path for downloading this node
  const TMP_REGISTRY_DIR = `${os.tmpdir() || '/tmp'}/xible-registry-`;

  function cleanUp(tmpRegDir) {
    if (!tmpRegDir) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      // remove the tmp dir
      fsExtra.remove(tmpRegDir, (err) => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });
  }

  /**
  * Installs a flow from a registry.
  * @param {String} altName The name to publish the flow with. Defaults to the flow name.
  * @returns {Promise}
  */
  xibleRegistry.Flow.prototype.install = function flowInstall(altName) {
    if (!XIBLE.Config.getValue('registry.flows.allowinstall')) {
      return Promise.reject('Your config does not allow to install flows from the registry');
    }

    let flowPath = XIBLE.Config.getValue('flows.path');
    if (!flowPath) {
      return Promise.reject('no "flows.path" configured');
    }
    flowPath = XIBLE.resolvePath(flowPath);

    if (altName) {
      if (!XIBLE.Flow.validateId(altName)) {
        return Promise.reject('flow _id/name cannot contain reserved/unsave characters');
      }
      this._id = altName;
      this.name = altName;
    }

    // remove fields specifically for the registry
    delete this.publishUserName;
    delete this.publishDate;

    return new Promise((resolve, reject) => {
      // write
      const flowDestPath = `${flowPath}/${this._id}.json`;
      fsExtra.writeFile(flowDestPath, JSON.stringify(this, null, '\t'), (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  };

  /**
  * Installs a nodepack from a registry.
  * @returns {Promise}
  */
  xibleRegistry.NodePack.prototype.install = function nodePackInstall() {
    if (!XIBLE.Config.getValue('registry.nodepacks.allowinstall')) {
      return Promise.reject('Your config does not allow to install nodepacks from the registry');
    }

    let tmpRegDir;
    let nodePath = XIBLE.Config.getValue('nodes.path');
    if (!nodePath) {
      return Promise.reject('no "nodes.path" configured');
    }
    nodePath = XIBLE.resolvePath(nodePath);

    // get the registrydata
    return this.getRegistryData()
    .then((registryData) => {
      if (!registryData.name) {
        return Promise.reject(`No "name" field found in the registry data for node "${this.name}"`);
      }

      return this.getTarballUrl()
      .then(tarballUrl => new Promise((resolve, reject) => {
        // check if the tarbalUrl is safe
        if (encodeURI(tarballUrl) !== tarballUrl) {
          reject(new Error('Package URL contains potentially unsafe characters'));
          return;
        }

        // create the tmp dir
        fsExtra.mkdtemp(TMP_REGISTRY_DIR, (err, mTmpRegDir) => {
          tmpRegDir = mTmpRegDir;
          if (err) {
            reject(err);
            return;
          }

          // create a package.json so npm knows where the root lies
          // remove the dependencies from the package so npm doesn't get confused
          const packageJson = require(`${__dirname}/../../package.json`);
          delete packageJson.dependencies;
          delete packageJson.devDependencies;

          // write off package.json
          fsExtra.writeFile(`${tmpRegDir}/package.json`, JSON.stringify(packageJson), (createPackageJsonErr) => {
            if (createPackageJsonErr) {
              reject(createPackageJsonErr);
              return;
            }

            // fork npm to install the registry url
            const fork = require('child_process').spawn;
            const npm = fork('npm', ['install', '--no-save', tarballUrl], {
              cwd: tmpRegDir,
              shell: true
            });

            npm.on('error', npmErr => reject(npmErr));

            npm.on('exit', (exitCode) => {
              if (exitCode) {
                reject(`exited with code: ${exitCode}`);
                return;
              }

              // specify the dir where this node will be installed
              const nodeDestDir = `${nodePath}/${this.name}`;

              // when success, resolve
              const onSuccess = () => XIBLE.Node
              .initFromPath(nodeDestDir)
              .then(() => cleanUp(tmpRegDir))
              .then(() => {
                // see if we can/need to reinit flows that are not runnable
                const flows = XIBLE.getFlows();
                for (const flowId in flows) {
                  if (!flows[flowId].runnable) {
                    flows[flowId].initJson(flows[flowId].json);
                  }
                }
              })
              .then(resolve)
              .catch((onSuccessErr) => {
                reject(onSuccessErr);
              });

              // remove existing node directory
              fsExtra.emptyDir(nodeDestDir, (removeExistingNodeErr) => {
                if (removeExistingNodeErr) {
                  reject(removeExistingNodeErr);
                  return;
                }

                // first move the node itself
                fsExtra.move(`${tmpRegDir}/node_modules/${registryData.name}`, nodeDestDir, {
                  overwrite: true
                }, (moveNodeErr) => {
                  if (moveNodeErr) {
                    reject(moveNodeErr);
                    return;
                  }

                  // check if there's anything left in node_modules
                  fsExtra.readdir(`${tmpRegDir}/node_modules`, (remainingNodeModulesErr, files) => {
                    if (remainingNodeModulesErr) {
                      reject(remainingNodeModulesErr);
                      return;
                    }

                    if (!files.length) {
                      onSuccess();
                      return;
                    }

                    // move the rest of the node_modules
                    fsExtra.move(`${tmpRegDir}/node_modules`, `${nodeDestDir}/node_modules`, {
                      overwrite: true
                    }, (moveNodeModulesErr) => {
                      if (moveNodeModulesErr) {
                        reject(moveNodeModulesErr);
                        return;
                      }

                      onSuccess();
                    });
                  });
                });
              });
            });

            npm.stdout.on('data', (data) => {
              console.log(data.toString());
            });

            npm.stderr.on('data', (data) => {
              console.log(data.toString());
            });
          });
        });
      }));
    })
    .catch(err =>
      cleanUp(tmpRegDir)
      .then(() => Promise.reject(err))
      .catch(() => Promise.reject(err))
    );
  };

  if (EXPRESS_APP) {
    require('./routes.js')(xibleRegistry, XIBLE, EXPRESS_APP);
  }

  return {
    Registry: xibleRegistry
  };
};
