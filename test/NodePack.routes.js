'use strict';

/* eslint-disable func-names */
/* eslint-disable prefer-arrow-callback */

const assert = require('assert');
const supertest = require('supertest');
const Xible = require('..');
const packageJson = require('../package.json');

const CONFIG_PATH = '~/.xible/config.json';
const xible = new Xible({
  configPath: CONFIG_PATH
});

describe('/api/nodepacks', function () {
  before(function () {
    this.timeout(10000);
    return xible.init();
  });

  after(function () {
    return xible.close();
  });

  describe('GET /', function () {
    it('should return list of nodepacks', function () {
      return supertest(xible.expressApp)
      .get('/api/nodepacks')
      .expect(200);
    });

    it('should contain all default nodepacks', async function () {
      const defaultNodePackNames = Object.keys(packageJson.dependencies)
      .filter((packageName) => packageName.startsWith('xible-np-') || packageName.startsWith('xible-nodepack-'))
      .map((packageName) => (
        packageName.startsWith('xible-np-')
          ? packageName.substring(9)
          : packageName.substring(15)
      ));

      const res = await supertest(xible.expressApp)
      .get('/api/nodepacks');

      const hostedNodePackNames = Object.keys(res.body);
      assert(defaultNodePackNames.every(
        (defaultNodePackName) => hostedNodePackNames.includes(defaultNodePackName)
      ));
    });
  });

  describe('GET /:nodePackName', function () {
    before(function () {
      this.timeout(120000);

      return supertest(xible.expressApp)
      .patch('/api/registry/nodepacks/stream/install')
      .expect(200);
    });

    it('existing should return 200', function () {
      return supertest(xible.expressApp)
      .get('/api/nodepacks/stream')
      .expect(200);
    });
  });

  describe('DELETE /:nodePackName', function () {
    it('should delete nodepack', function () {
      return supertest(xible.expressApp)
      .delete('/api/nodepacks/stream')
      .expect(200);
    });

    it('should return 404', function () {
      return supertest(xible.expressApp)
      .get('/api/nodepacks/stream')
      .expect(404);
    });
  });
});
