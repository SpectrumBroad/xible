View.routes['/settings/registry'] = function(EL) {

	EL.innerHTML = `
		<section>
			<h1>Registry</h1>
			<section id="general">
				<h2>General</h2>
				<dl>
					<dt>
						<label for="settingsRegistryGeneralUrl">
							URL
							<div>Connection URL towards the XIBLE registry. This registry is used for downloading nodepacks and flows.</div>
						</label>
					</dt>
					<dd><input id="settingsRegistryGeneralUrl" type="url" data-configpath="registry.url" /></dd>
				</dl>
			</section>
			<section id="nodepacks">
				<h2>Nodepacks</h2>
				<dl>

					<dd class="checkbox">
						<label for="settingsRegistryNodepacksAllowPublish">
							<input type="checkbox" value="true" id="settingsRegistryNodepacksAllowPublish" data-configpath="registry.nodepacks.allowpublish" />
							<span></span>
						</label>
					</dd>
					<dt class="checkbox">
						<label for="settingsRegistryNodepacksAllowPublish">
							Allow publish
							<div>Enable or disable the ability to publish nodepacks.</div>
						</label>
					</dt>

					<dd class="checkbox">
						<label for="settingsRegistryNodepacksAllowInstall">
							<input type="checkbox" value="true" id="settingsRegistryNodepacksAllowInstall" data-configpath="registry.nodepacks.allowinstall" />
							<span></span>
						</label>
					</dd>
					<dt class="checkbox">
						<label for="settingsRegistryNodepacksAllowInstall">
							Allow install
							<div>Enable or disable the ability to install nodepacks.</div>
						</label>
					</dt>

				</dl>
			</section>
			<section id="flows">
				<h2>Flows</h2>
				<dl>

					<dd class="checkbox">
						<label for="settingsRegistryFlowsAllowPublish">
							<input type="checkbox" value="true" id="settingsRegistryFlowsAllowPublish" data-configpath="registry.flows.allowpublish" />
							<span></span>
						</label>
					</dd>
					<dt class="checkbox">
						<label for="settingsRegistryFlowsAllowPublish">
							Allow publish
							<div>Enable or disable the ability to publish flows.</div>
						</label>
					</dt>

					<dd class="checkbox">
						<label for="settingsRegistryFlowsAllowInstall">
							<input type="checkbox" value="true" id="settingsRegistryFlowsAllowInstall" data-configpath="registry.flows.allowinstall" />
							<span></span>
						</label>
					</dd>
					<dt class="checkbox">
						<label for="settingsRegistryFlowsAllowInstall">
							Allow install
							<div>Enable or disable the ability to install flows.</div>
						</label>
					</dt>

				</dl>
			</section>
		</section>
	`;

};
