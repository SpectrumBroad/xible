View.routes['/settings'] = function(EL) {

	EL.innerHTML = `
		<div id="sub">
			<header>XIBLE</header>
			<p id="validateWritePermissions" class="status loading">Validating write permissions</p>
			<section>
				<h1>General</h1>
				<ul>
					<li><a href="/settings/general#webserver" onclick="settingsViewHolder.navigate('/settings/general#webserver'); return false;">Webserver</a></li>
					<li><a href="#">test 2</a></li>
				</ul>
			</section>
			<section>
				<h1>Editor</h1>
				<ul>
					<li><a href="/settings/editor#general" onclick="settingsViewHolder.navigate('/settings/editor#general'); return false;">General</a></li>
					<li><a href="#">test 2</a></li>
				</ul>
			</section>
			<section>
				<h1>Security</h1>
				<ul>
					<li><a href="#">Users</a></li>
					<li><a href="#">Groups</a></li>
					<li><a href="#">Permissions</a></li>
					<li><a href="#">Tokens</a></li>
				</ul>
			</section>
			<section>
				<h1>Registry</h1>
				<ul>
					<li><a href="/settings/registry#general" onclick="settingsViewHolder.navigate('/settings/registry#general'); return false;">General</a></li>
					<li><a href="/settings/registry#nodepacks" onclick="settingsViewHolder.navigate('/settings/registry#nodepacks'); return false;">Nodepacks</a></li>
					<li><a href="/settings/registry#flows" onclick="settingsViewHolder.navigate('/settings/registry#flows'); return false;">Flows</a></li>
				</ul>
			</section>
			<!--
			<section>
				<h1>Enterprise</h1>
				<ul>
					<li><a href="#">General</a></li>
				</ul>
			</section>
			-->
		</div>
		<div class="inner" id="settingsContent"></div>
	`;

	settingsViewHolder = new ViewHolder(document.getElementById('settingsContent'), '/settings');
	settingsViewHolder.on('render', (view) => {

		//unselect all buttons from lhs
		document.querySelectorAll(`#sub ul a`)
			.forEach((a) => a.classList.remove('view'));

		//select the button from lhs
		let a = document.querySelector(`#sub ul a[href*="${window.location.hash}"]`);
		if (!a) {
			return;
		}
		a.classList.add('view');

	});
	settingsViewHolder.hookNavHandler();
	settingsViewHolder.loadNav().catch(() => {
		mainViewHolder.navigate('/settings/general');
	});

	//validate if the config can be altered
	let permissionsValidate = document.getElementById('validateWritePermissions');
	xibleWrapper.Config.validatePermissions().then((result) => {

		permissionsValidate.addEventListener('animationiteration', () => {
			permissionsValidate.classList.remove('loading');
		}, {
			once: true
		});

		if (result) {

			permissionsValidate.innerHTML = 'Write permissions check success.';
			permissionsValidate.classList.remove('checking');
			permissionsValidate.classList.add('success');

			window.setTimeout(() => {
				permissionsValidate.parentNode.removeChild(permissionsValidate);
			}, 6000);

		} else {

			permissionsValidate.innerHTML = 'Writing to the configuration file failed. Please check permissions.';
			permissionsValidate.classList.remove('checking', 'loading');
			permissionsValidate.classList.add('alert');

		}

	});

};
