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

describe('/api/flows', () => {
  before(function () {
    return xible.init();
  });

  after(function () {
    return xible.close();
  });

  describe('GET /', () => {
    it('should return list of flows', () => {
      return supertest(xible.expressApp)
      .get('/api/flows')
      .expect(200);
    });
  });

  describe('POST /:flowId', () => {
    it('should create new flow', () => {
      return supertest(xible.expressApp)
      .post('/api/flows')
      .send({
        _id: 'new_test_flow',
        nodes: [],
        connectors: []
      })
      .expect(200)
      .expect(res => res.body._id === 'new_test_flow');
    });
  });

  describe('GET /:flowId', () => {
    it('existing should return flow', () => {
      return supertest(xible.expressApp)
      .get('/api/flows/new_test_flow')
      .expect(200)
      .expect(res => res.body._id === 'new_test_flow');
    });
  });

  describe('POST /:flowId/instances', () => {
    it('should create new instance', () => {
      return supertest(xible.expressApp)
      .post('/api/flows/new_test_flow/instances')
      .expect(200);
    });
  });

  describe('POST /:flowId/instances', function () {
    this.timeout(20000);
    it('should create and start new instance', () => {
      return supertest(xible.expressApp)
      .post('/api/flows/new_test_flow/instances')
      .send({ start: true })
      .expect(200);
    });
  });

  describe('DELETE /:flowId', () => {
    it('should delete flow', () => {
      return supertest(xible.expressApp)
      .delete('/api/flows/new_test_flow')
      .expect(200);
    });

    it('should return 404', () => {
      return supertest(xible.expressApp)
      .get('/api/flows/new_test_flow')
      .expect(404);
    });
  });
});
