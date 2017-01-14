View.routes.settings = function() {

	let menuHolder = this.element.appendChild(document.createElement('div'));
	menuHolder.setAttribute('id', 'sub');

	menuHolder.appendChild(document.createElement('header')).appendChild(document.createTextNode('XIBLE'));

	let section = menuHolder.appendChild(document.createElement('section'));
	section.innerHTML='<h1>General</h1><ul><li><a href="#">test</a></li><li><a href="#">test 2</a></li></ul>';

  section = menuHolder.appendChild(document.createElement('section'));
  section.innerHTML='<h1>Editor</h1><ul><li><a href="#">test</a></li><li><a href="#">test 2</a></li></ul>';

  section = menuHolder.appendChild(document.createElement('section'));
  section.innerHTML='<h1>Enterprise</h1><ul><li><a href="#">test</a></li><li><a href="#">test 2</a></li><li><a href="#">test</a></li><li><a href="#">test 2</a></li></ul>';

  //xibleWrapper.validateConfigPermissions();


  let div = this.element.appendChild(document.createElement('div'));
  div.classList.add('inner');
  div.innerHTML='<section><h1>Hello</h1><p>This is a test for the later markup.</p></section><section><form><dl><dt>label dt</dt><dd>Matching dd</dd></dl></form></section>';

	window.setTimeout(() => {

		let el = document.getElementById('configPermissionsMessage');
		el.innerHTML='Writing to the configuration file is not possible. Please check the permissions.';
		el.classList.remove('checking');
		el.classList.add('alert');

	}, 2000);

	window.setTimeout(() => {

		let el = document.getElementById('configPermissionsMessage');
		el.innerHTML='Success.';
		el.classList.remove('checking');
		el.classList.add('success');

	}, 4000);

};
