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

describe('/api/typedefs', function () {
  before(function () {
    this.timeout(10000);
    return xible.init();
  });

  after(function () {
    return xible.close();
  });

  describe('GET /', function () {
    it('should return list of typedefs', function () {
      return supertest(xible.expressApp)
      .get('/api/typedefs')
      .expect(200)
      .expect(res => assert.equal(res.body.string.name, 'string'));
    });
  });

  describe('GET /:typedef', function () {
    it('string should return single typedef', function () {
      return supertest(xible.expressApp)
      .get('/api/typedefs/string')
      .expect(200)
      .expect(res => assert.strictEqual(res.body.color, 'yellow'))
      .expect(res => assert.strictEqual(res.body.name, 'string'))
      .expect(res => assert.strictEqual(res.body.extends, 'object'));
    });

    it('non existing should return 404', function () {
      return supertest(xible.expressApp)
      .get('/api/typedefs/does_hopefully_not_exist_for_real')
      .expect(404);
    });
  });
});
