View.routes.settings = function(EL) {

	EL.innerHTML = `
		<div id="sub">
			<header>XIBLE</header>
			<p id="validateWritePermissions" class="status loading">Validating write permissions</p>
			<section>
				<h1>General</h1>
				<ul>
					<li><a href="#">test</a></li>
					<li><a href="#">test 2</a></li>
				</ul>
			</section>
			<section>
				<h1>Editor</h1>
				<ul>
					<li><a href="#">test</a></li>
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
					<li><a href="#">General</a></li>
					<li><a href="#">Nodes</a></li>
					<li><a href="#">Flows</a></li>
				</ul>
			</section>
			<section>
				<h1>Enterprise</h1>
				<ul>
					<li><a href="#">General</a></li>
				</ul>
			</section>
		</div>
		<div class="inner">
			<section>
				<h1>Hello</h1>
				<p>This is a test for the later markup.</p>
			</section>
			<section>
				<form>
					<dl>
						<dt>label dt</dt>
						<dd>Matching dd</dd>
					</dl>
				</form>
			</section>
		</div>
	`;

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
