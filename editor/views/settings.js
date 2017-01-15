View.routes.settings = function() {

	let menuHolder = this.element.appendChild(document.createElement('div'));
	menuHolder.setAttribute('id', 'sub');

	menuHolder.appendChild(document.createElement('header')).appendChild(document.createTextNode('XIBLE'));

	let permissionsValidate = menuHolder.appendChild(document.createElement('p'));
	permissionsValidate.innerHTML = 'Validating write permissions';
	permissionsValidate.classList.add('status', 'loading');

	let section = menuHolder.appendChild(document.createElement('section'));
	section.innerHTML = '<h1>General</h1><ul><li><a href="#">test</a></li><li><a href="#">test 2</a></li></ul>';

	section = menuHolder.appendChild(document.createElement('section'));
	section.innerHTML = '<h1>Editor</h1><ul><li><a href="#">test</a></li><li><a href="#">test 2</a></li></ul>';

	section = menuHolder.appendChild(document.createElement('section'));
	section.innerHTML = '<h1>Registry</h1><ul><li><a href="#">test</a></li><li><a href="#">test 2</a></li><li><a href="#">test</a></li><li><a href="#">test 2</a></li></ul>';

	section = menuHolder.appendChild(document.createElement('section'));
	section.innerHTML = '<h1>Enterprise</h1><ul><li><a href="#">test</a></li><li><a href="#">test 2</a></li><li><a href="#">test</a></li><li><a href="#">test 2</a></li></ul>';

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
				menuHolder.removeChild(permissionsValidate);
			}, 6000);

		} else {

			permissionsValidate.innerHTML = 'Writing to the configuration file failed. Please check permissions.';
			permissionsValidate.classList.remove('checking', 'loading');
			permissionsValidate.classList.add('alert');

		}

	});

	let div = this.element.appendChild(document.createElement('div'));
	div.classList.add('inner');
	div.innerHTML = `<section><h1>Hello</h1><p>This is a test for the later markup.</p></section><section><form><dl><dt>label dt</dt><dd>Matching dd</dd></dl></form></section>`;

};
