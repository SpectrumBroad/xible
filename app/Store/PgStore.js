const debug = require('debug');
const { Client } = require('pg');

const storeDebug = debug('xible:pgstore');

module.exports = (XIBLE) => {
  const { connectionString } = XIBLE;

  const FLOW_TABLE_NAME = 'flows';
  const FLOW_INSTANCE_TABLE_NAME = 'flowInstances';
  const FLOW_VAULT_TABLE_NAME = 'flowVault';
  let pgClient;

  class PgStore {
    static async init() {
      if (pgClient != null) {
        return;
      }

      if (connectionString == null || connectionString === '') {
        throw new Error('Missing connection-string');
      }

      storeDebug('Connecting to', connectionString);

      pgClient = new Client({
        connectionString
      });
      await pgClient.connect();

      await this.#createSchema();
    }

    static async #createSchema() {
      await pgClient.query(
        `create table if not exists ${FLOW_TABLE_NAME}
        (
          name text, structure jsonb,
          primary key(name)
        )`
      );

      await pgClient.query(
        `create table if not exists ${FLOW_INSTANCE_TABLE_NAME}
        (
          flow_name text, flow_instance_id text, status jsonb,
          primary key(flow_name, flow_instance_id),
          constraint fk_flow
            foreign key(flow_name)
            references ${FLOW_TABLE_NAME}(name)
        )`
      );

      await pgClient.query(
        `create table if not exists ${FLOW_VAULT_TABLE_NAME}
        (
          node_id text, data jsonb,
          primary key(node_id)
        )`
      );
    }

    static validateFlowPermissions() {
      return true;
    }

    static async getFlowJsons() {
      const res = await pgClient.query(`select name, structure from ${FLOW_TABLE_NAME}`);

      return res.rows.map((flow) => flow.structure);
    }

    /**
     * @param {*} flowName
     * @returns {Promise<{}>} - The JSON definition for the flow.
     */
    static async getOneFlowJson(flowName) {
      const res = await pgClient.query(
        `select name, structure from ${FLOW_TABLE_NAME} where name=$1::text`,
        [flowName]
      );

      return res.rows[0]?.structure ?? null;
    }

    static async saveFlow(flow) {
      await pgClient.query(
        `insert into ${FLOW_TABLE_NAME} (name, structure) values ($1::text, $2::jsonb)
        on conflict (name)
        do update set structure = excluded.structure
        `,
        [flow._id, flow]
      );
    }

    static async deleteFlow(flow) {
      await pgClient.query('begin');

      await pgClient.query(
        `delete from ${FLOW_TABLE_NAME} where name=$1::text`,
        [flow._id]
      );

      await pgClient.query(
        `delete from ${FLOW_INSTANCE_TABLE_NAME} where flow_name=$1::text`,
        [flow._id]
      );

      await pgClient.query('commit');
    }

    static async getFlowInstanceStatuses() {
      const res = await pgClient.query(
        `select flow_name, flow_instance_id, status from ${FLOW_INSTANCE_TABLE_NAME}`
      );

      return res.rows.reduce((statuses, row) => {
        let targetFlow = statuses[row.flow_name];
        if (targetFlow == null) {
          targetFlow = [];
          statuses[row.flow_name] = targetFlow;
        }

        targetFlow.push(row.status);

        return statuses;
      }, {});
    }

    static async saveFlowInstanceStatus(flowName, flowInstanceId, status) {
      await pgClient.query(
        `insert into ${FLOW_INSTANCE_TABLE_NAME} (flow_name, flow_instance_id, status) values ($1::text, $2::text, $3::jsonb)
        on conflict (flow_name, flow_instance_id)
        do update set status = excluded.status
        `,
        [flowName, flowInstanceId, JSON.stringify(status)]
      );
    }

    static async deleteFlowInstanceStatus(flowName, flowInstanceId) {
      await pgClient.query(
        `delete from ${FLOW_INSTANCE_TABLE_NAME} where flow_name=$1::text and flow_instance_id=$2::text`,
        [flowName, flowInstanceId]
      );
    }

    static async getVaultContents() {
      const res = await pgClient.query(
        `select node_id, data from ${FLOW_VAULT_TABLE_NAME}`
      );

      return Object.fromEntries(res.rows.map((row) => [
        row.node_id,
        row.data
      ]));
    }

    static async saveVault(contents) {
      await pgClient.query('begin');

      await pgClient.query(`delete from ${FLOW_VAULT_TABLE_NAME}`);

      await Promise.all(Object.entries(contents).map(([nodeId, data]) => (
        pgClient.query(
          `insert into ${FLOW_VAULT_TABLE_NAME} (node_id, data) values ($1::text, $2::jsonb)
          on conflict (node_id)
          do update set data = excluded.data`,
          [nodeId, data]
        )
      )));

      await pgClient.query('commit');
    }
  }

  return {
    PgStore
  };
};
