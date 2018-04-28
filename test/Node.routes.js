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

describe('/api/nodes', function () {
  before(function () {
    return xible.init();
  });
  
  after(function () {
    return xible.close();
  });

  describe('GET /', function () {
    it('should return list of nodes', function () {
      return supertest(xible.expressApp)
      .get('/api/nodes')
      .expect(200);
    });
  });

  describe('GET /:nodeName', function () {
    it('non existing should return 404', function () {
      return supertest(xible.expressApp)
      .get('/api/nodes/non_existing_nodeName')
      .expect(404);
    });

    it('console.log should return node definition', function () {
      return supertest(xible.expressApp)
      .get('/api/nodes/console.log')
      .expect(200);
    });
  });
});
