View.routes['/settings/editor'] = function(EL) {

	EL.innerHTML = `
		<section>
			<h1>Editor</h1>
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
