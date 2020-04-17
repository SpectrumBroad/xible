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

describe('/api', function () {
  before(function () {
    this.timeout(10000);
    return xible.init();
  });

  after(function () {
    return xible.close();
  });

  describe('GET /api/validateFlowPermissions', function () {
    it('should return boolean', function () {
      return supertest(xible.expressApp)
      .get('/api/validateFlowPermissions')
      .expect(200)
      .expect((res) => assert(typeof res.body === 'boolean'))
    });
  });

  describe('GET /api/serverDate', function () {
    it('should return date since epoch', function () {
      return supertest(xible.expressApp)
      .get('/api/serverDate')
      .expect(200)
      .expect((res) => assert(typeof res.body === 'number'))
    });
  });

  describe('GET /api/persistentWebSocketMessages', function () {
    it('should return object map', function () {
      return supertest(xible.expressApp)
      .get('/api/persistentWebSocketMessages')
      .expect(200)
      .expect((res) => assert.deepStrictEqual(res.body, {}))
    });
  });
});
