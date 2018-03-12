'use strict';

View.routes['/settings/editor'] = (EL) => {
  EL.innerHTML = `
    <section>
      <h1>Editor</h1>

      <section id="settings">
        <h2>Settings</h2>
        <p class="warning">
          Changing these values will impact your ability to change them back from this page.
        </p>
        <dl>
          <dd class="checkbox">
            <label for="settingsEditorSettingsAllowChange">
              <input type="checkbox" value="true" id="settingsEditorSettingsAllowChange" data-configpath="editor.settings.allowchange" />
              <span></span>
            </label>
          </dd>
          <dt class="checkbox">
            <label for="settingsEditorSettingsAllowChange">
              Allow changing settings through the editor
              <div>
                This enables/disables the ability of changing settings through any of the API routes. Therefor the editor is affected as well.<br/>
                By disabling this setting, you can only change the configuration from the commandline or by amending the config.json directly.
              </div>
            </label>
          </dt>

          <dd class="checkbox">
            <label for="settingsEditorSettingsVisible">
              <input type="checkbox" value="true" id="settingsEditorSettingsVisible" data-configpath="editor.settings.visible" />
              <span></span>
            </label>
          </dd>
          <dt class="checkbox">
            <label for="settingsEditorSettingsVisible">
              Settings visible through the editor
              <div>
                Disabling this setting does not imply that settings cannot be changed or read through the API routes.
              </div>
            </label>
          </dt>
        </dl>
      </section>

      <section id="nodes">
        <h2>Nodes</h2>
        <dl>
          <dt>
            <label for="settingsEditorNodesStatusesMax">
              Maximum status lines per node
              <div>
                The maximum amount of status lines visible on each node. Statuses are removed on the first-in-first-out principle.<br/>
                Progress bars are not taken into account. An empty value indicates no limit.
              </div>
            </label>
          </dt>
          <dd><input id="settingsEditorNodesStatusesMax" type="number" min="0" data-configpath="editor.nodes.statuses.max" /></dd>
        </dl>
      </section>

      <section id="flows">
        <h2>Flows</h2>
        <p class="warning">
          Running a flow in direct mode can have undesired side-effects. Take special note of the <a href="https://xible.io/docs/editor#direct" target="_blank" rel="noopener">online documentation</a>.
        </p>
        <dl>
          <dd class="checkbox">
            <label for="settingsEditorFlowsAllowDirect">
              <input type="checkbox" value="true" id="settingsEditorFlowsAllowDirect" data-configpath="editor.flows.allowdirect" />
              <span></span>
            </label>
          </dd>
          <dt class="checkbox">
            <label for="settingsEditorFlowsAllowDirect">
              Allow direct mode
              <div>Enable or disable the ability to run part of a flow directly.</div>
            </label>
          </dt>
        </dl>
      </section>

      <section id="viewstate">
        <h2>Viewstate</h2>
        <dl>
          <dt>
            <label for="settingsEditorViewStateZoomStateOnOpen">
              Zoom state on open
              <div>
                Change the zoom state of a flow when opening.<br/>
                Note that any alteration in the viewstate will be saved when hitting 'Save' or 'Deploy' on the flow.
              </div>
            </label>
          </dt>
          <dd>
            <select id="settingsEditorViewStateZoomStateOnOpen" data-configpath="editor.viewstate.zoomstateonopen">
              <option value="untouched">Untouched - Leaves the state as-is</option>
              <option value="reset">Reset - Sets the zoom level to the default value</option>
              <option value="fit">Fit - Zooms to fit</option>
            </select>
          </dd>
        </dl>
      </section>
    </section>
  `;
};
