'use strict';

/* eslint-disable func-names */
/* eslint-disable prefer-arrow-callback */

const supertest = require('supertest');
const Xible = require('..');

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
