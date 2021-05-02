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

describe('/api/flows', function () {
  before(function () {
    this.timeout(10000);
    return xible.init();
  });

  after(function () {
    return xible.close();
  });

  describe('GET /', function () {
    it('should return list of flows', function () {
      return supertest(xible.expressApp)
        .get('/api/flows')
        .expect(200);
    });
  });

  describe('POST /:flowId', function () {
    it('should create new flow', function () {
      return supertest(xible.expressApp)
        .post('/api/flows')
        .send({
          _id: 'new_test_flow',
          nodes: [],
          connectors: []
        })
        .expect(200)
        .expect((res) => assert(res.body._id === 'new_test_flow'));
    });

    it('should fail on flow name', function () {
      return supertest(xible.expressApp)
      .post('/api/flows')
      .send({
        _id: 'new_test_flow ',
        nodes: [],
        connectors: []
      })
      .expect(400);
    });
  });

  describe('GET /:flowId', function () {
    it('existing should return flow', function () {
      return supertest(xible.expressApp)
        .get('/api/flows/new_test_flow')
        .expect(200)
        .expect((res) => assert(res.body._id === 'new_test_flow'));
    });
  });

  describe('POST /:flowId/instances', function () {
    it('should create new instance', function () {
      return supertest(xible.expressApp)
        .post('/api/flows/new_test_flow/instances')
        .expect(200);
    });
  });

  describe('POST /:flowId/instances', function () {
    this.timeout(20000);
    it('should create and start new instance', function () {
      return supertest(xible.expressApp)
        .post('/api/flows/new_test_flow/instances')
        .send({ start: true })
        .expect(200);
    });
  });

  describe('DELETE /:flowId', function () {
    it('should delete flow', function () {
      return supertest(xible.expressApp)
        .delete('/api/flows/new_test_flow')
        .expect(200);
    });

    it('should return 404', function () {
      return supertest(xible.expressApp)
        .get('/api/flows/new_test_flow')
        .expect(404);
    });
  });
});
