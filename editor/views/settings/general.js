'use strict';

View.routes['/settings/general'] = (EL) => {
  EL.innerHTML = `
    <section>
      <h1>General</h1>

      <p class="warning">
        Changing any of the values in this section requires a restart of XIBLE.<br/>
        Also note that after a restart as a consequence of these changes, the web interface may no longer be available on the current URL.
      </p>

      <section id="webserver">
        <h2>Webserver</h2>
        <dl>
          <dt>
            <label for="settingsGeneralWebserverPort">
              Port
              <div>The plain-HTTP (non-SSL) port this web interface and the API routes are hosted on. If SSL is enabled, requests from this port are redirected to a secure connection on SSL port.</div>
            </label>
          </dt>
          <dd><input id="settingsGeneralWebserverPort" type="number" data-configpath="webserver.portnumber" placeholder="9600" /></dd>

          <dt>
            <label for="settingsGeneralWebserverSecurePort">
              SSL port
              <div>The secure HTTPS (SSL) port this web interface and the API routes are hosted on.</div>
            </label>
          </dt>
          <dd><input id="settingsGeneralWebserverSecurePort" type="number" data-configpath="webserver.ssl.portnumber" placeholder="9601" /></dd>

          <dt>
            <label for="settingsGeneralWebserverKeyPath">
              SSL key path
              <div>Path to a SSL key file. If configured together with the &quot;SSL certificate path&quot;, SSL will be enabled and plain HTTP requests redirect to the HTTPS connection.</div>
            </label>
          </dt>
          <dd><input id="settingsGeneralWebserverKeyPath" type="text" data-configpath="webserver.ssl.keypath" /></dd>

          <dt>
            <label for="settingsGeneralWebserverCertPath">
              SSL certificate path
              <div>Path to a SSL certificate file. If configured together with the &quot;SSL key path&quot;, SSL will be enabled and plain HTTP requests redirect to the HTTPS connection.</div>
            </label>
          </dt>
          <dd><input id="settingsGeneralWebserverCertPath" type="text" data-configpath="webserver.ssl.certpath" /></dd>
        </dl>
      </section>

      <section id="nodes">
        <h2>Nodes</h2>
        <dl>
          <dt>
            <label for="settingsGeneralNodesPath">
              Nodes path
              <div>
                Path to the directory containing the nodes/nodepacks.<br/>
                Note that &quot;./nodes&quot; from the XIBLE installation directory is always loaded, in addition to this configured path.
              </div>
            </label>
          </dt>
          <dd><input id="settingsGeneralNodesPath" type="text" data-configpath="nodes.path" /></dd>
        </dl>
      </section>

      <section id="flows">
        <h2>Flows</h2>
        <dl>
          <dt>
            <label for="settingsGeneralFlowsPath">
              Flows path
              <div>Path to the directory containing the flows.</div>
            </label>
          </dt>
          <dd><input id="settingsGeneralFlowsPath" type="text" data-configpath="flows.path" /></dd>

          <dt>
            <label for="settingsGeneralFlowsInitLevel">
              Initialization level
              <div>
                Default initialization level that flows are kept on when they are not active.<br/>
                The higher the level, the faster flows start. However, they also consume more resources without actually running.
              </div>
            </label>
          </dt>
          <dd>
            <select id="settingsGeneralFlowsInitLevel" type="number" data-configpath="flows.initlevel">
              <option value="0">0 - None</option>
              <option value="1">1 - Flow</option>
              <!-- <option value="2">2 - Nodes</option> -->
            </select>
          </dd>
        </dl>
      </section>

      <section id="vault">
        <h2>Vault</h2>

        <p class="warning">
          Credentials, tokens and other secrets required in some nodes, are stored in the vault.<br/>
          Changing any of the settings in this section may break configured flows containing nodes which rely on vault data.
        </p>

        <dl>
          <dt>
            <label for="settingsGeneralVaultPath">
              Vault path
              <div>Path to the directory containing the flows.</div>
            </label>
          </dt>
          <dd><input id="settingsGeneralVaultPath" type="text" data-configpath="vault.path" /></dd>
        </dl>
      </section>
    </section>
  `;
};
