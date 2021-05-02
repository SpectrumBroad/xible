'use strict';

/* eslint-disable func-names */
/* eslint-disable prefer-arrow-callback */

const fs = require('fs');
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

    describe('vault', function () {
      const consumerKey = Xible.generateObjectId();
      const stringValue = Xible.generateObjectId();

      before(function () {
        // create a flow with a node that has a vaulted value
        return supertest(xible.expressApp)
          .post('/api/flows')
          .send({
            _id: 'vault_test_flow',
            nodes: [
              {
                _id: '1',
                inputs: {},
                outputs: {
                  twitter: {
                    _id: '2',
                    name: 'twitter',
                    type: 'twitter'
                  }
                },
                left: 0,
                top: 0,
                data: {
                  consumerKey,
                  consumerSecret: '',
                  accessToken: '',
                  accessTokenSecret: ''
                },
                type: 'object',
                name: 'twitter'
              },
              {
                _id: '3',
                inputs: {
                  concat: {
                    _id: '4',
                    name: 'concat',
                    type: 'string'
                  }
                },
                outputs: {
                  result: {
                    _id: '5',
                    name: 'result',
                    type: 'string'
                  }
                },
                left: 50,
                top: 50,
                data: {
                  value: stringValue
                },
                type: 'object',
                name: 'string'
              }
            ],
            connectors: []
          })
          .expect(200);
      });

      it('vaulted values _should not_ be stored in flow', function () {
        // check the contents of the flow, it should not contain the consumerKey
        const flowsPath = xible.resolvePath(xible.Config.getValue('flows.path'));
        const flowJson = fs.readFileSync(`${flowsPath}/vault_test_flow.json`);
        assert(!flowJson.includes(consumerKey));
        assert(flowJson.includes(stringValue));
      });

      it('vaulted values _should_ be stored in vault', function () {
        // check the contents of the vault, it should contain the consumerKey
        const vaultPath = xible.resolvePath(xible.Config.getValue('vault.path'));
        const vaultJson = fs.readFileSync(vaultPath);
        assert(vaultJson.includes(consumerKey));
        assert(!vaultJson.includes(stringValue));
      });

      after(function () {
        // delete the test flow
        return supertest(xible.expressApp)
          .delete('/api/flows/vault_test_flow')
          .expect(200);
      });
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
