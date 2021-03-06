'use strict';

/* eslint-disable func-names */
/* eslint-disable prefer-arrow-callback */

const fs = require('fs/promises');
const assert = require('assert');
const Xible = require('..');

const CONFIG_PATH = '~/.xible/config.json';
const xible = new Xible({
  configPath: CONFIG_PATH
});

describe('Node', function () {
  before(function () {
    this.timeout(10000);
    return xible.init();
  });

  after(function () {
    return xible.close();
  });

  describe('getStructure', function () {
    const dirPath = `${__dirname}/../nodes/test-node`;
    before(async function () {
      await fs.mkdir(dirPath);
    });

    after(async function () {
      await fs.rm(dirPath, { force: true, recursive: true });
    });

    it('empty dir should return null', async function () {
      assert.equal(await xible.Node.getStructure(dirPath), null);
    });

    it('non-structure.json should return null', async function () {
      await fs.writeFile(`${dirPath}/ignore.json`, '{}');
      assert.equal(await xible.Node.getStructure(dirPath), null);
    });

    it('faulty structure.json should throw', async function () {
      await fs.writeFile(`${dirPath}/structure.json`, '{ name: "test-node" }'); // note missing quotes around 'name' key
      assert.rejects(async () => xible.Node.getStructure(dirPath));
    });

    it('structure.json should return', async function () {
      await fs.writeFile(`${dirPath}/structure.json`, '{ "name": "test-node" }');
      const structure = await xible.Node.getStructure(dirPath);
      assert.equal(structure.node.name, 'test-node');
      assert.deepEqual(structure.node.routePaths, {});
    });

    it('faulty typdef.json should throw', async function () {
      await fs.writeFile(`${dirPath}/typedef.json`, '{ name: "test-node" }');
      assert.rejects(async () => xible.Node.getStructure(dirPath));
    });

    it('typedef.json should return', async function () {
      await fs.writeFile(`${dirPath}/typedef.json`, '{ "test-node": { "color": "gold" } }');
      const structure = await xible.Node.getStructure(dirPath);
      assert.equal(structure.typedefs['test-node'].color, 'gold');
    });

    it('editor should return', async function () {
      await fs.mkdir(`${dirPath}/editor`);
      const structure = await xible.Node.getStructure(dirPath);
      assert.notEqual(structure.node.editorContentPath, null);
      assert.equal(structure.node.editorContentIndexPath, null);
    });

    it('editor index should return', async function () {
      await fs.writeFile(`${dirPath}/editor/index.htm`, '<input />');
      const structure = await xible.Node.getStructure(dirPath);
      assert.notEqual(structure.node.editorContentIndexPath, null);
    });

    it('routes/global.js should return', async function () {
      await fs.mkdir(`${dirPath}/routes`);
      await fs.writeFile(`${dirPath}/routes/global.js`, 'process.exit(0);');
      const structure = await xible.Node.getStructure(dirPath);
      assert.notEqual(structure.node.routePaths.global, null);
      assert.equal(structure.node.routePaths.flow, null);
    });

    it('routes/flow.js should return', async function () {
      await fs.writeFile(`${dirPath}/routes/flow.js`, 'process.exit(0);');
      const structure = await xible.Node.getStructure(dirPath);
      assert.notEqual(structure.node.routePaths.global, null);
      assert.notEqual(structure.node.routePaths.flow, null);
    });

    it('vault[] should translate to dataStructure[].vault and vice versa', async function () {
      await fs.writeFile(`${dirPath}/structure.json`, '{ "name": "test-node", "dataStructure": { "some": {}, "else": { "vault": true } }, "vault": ["some"] }');
      delete require.cache[require.resolve(`${dirPath}/structure.json`)];
      const structure = await xible.Node.getStructure(dirPath);
      assert.equal(structure.node.dataStructure.some.vault, true);
      assert.equal(structure.node.vault.includes('else'), true);
    });

    it('dataStructure[].vault should translate to non-existing vault[]', async function () {
      await fs.writeFile(`${dirPath}/structure.json`, '{ "name": "test-node", "dataStructure": { "some": {}, "else": { "vault": true } } }');
      delete require.cache[require.resolve(`${dirPath}/structure.json`)];
      const structure = await xible.Node.getStructure(dirPath);
      assert.equal(structure.node.vault.includes('else'), true);
    });

    it('vault[] should ignore non-existing dataStructure[]', async function () {
      await fs.writeFile(`${dirPath}/structure.json`, '{ "name": "test-node", "vault": ["some"] }');
      delete require.cache[require.resolve(`${dirPath}/structure.json`)];
      const structure = await xible.Node.getStructure(dirPath);
      assert.equal(structure.node.dataStructure, null);
    });
  });
});
