'use strict';

/* eslint-disable func-names */
/* eslint-disable prefer-arrow-callback */

const assert = require('assert');
const supertest = require('supertest');
const Xible = require('..');

const CONFIG_PATH = '~/.xible/config.json';
const xible = new Xible({
  configPath: CONFIG_PATH
});

describe('/api/registry', function () {
  before(function () {
    this.timeout(10000);
    return xible.init();
  });

  after(function () {
    return xible.close();
  });

  describe('GET /nodepacks?search=test', function () {
    it('should return list of nodepacks', function () {
      return supertest(xible.expressApp)
      .get('/api/registry/nodepacks?search=test')
      .expect(200);
    });
  });

  describe('PATCH /nodepacks/not_exist_nodepack/install', function () {
    it('should return 404', function () {
      return supertest(xible.expressApp)
      .patch('/api/registry/nodepacks/not_exist_nodepack/install')
      .expect(404);
    });
  });

  describe('PATCH /nodepacks/stream/install', function () {
    this.timeout(120000);
    it('should install nodepack', function () {
      return supertest(xible.expressApp)
      .patch('/api/registry/nodepacks/stream/install')
      .expect(200);
    });
  });
});
