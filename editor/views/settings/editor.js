View.routes['/settings/editor'] = function(EL) {

	EL.innerHTML = `
		<section>
			<h1>Editor</h1>
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
