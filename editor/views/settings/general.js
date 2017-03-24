View.routes['/settings/general'] = function(EL) {

	EL.innerHTML = `
	<section>
		<h1>General</h1>
		<section id="webserver">
			<h2>Webserver</h2>
			<dl>
				<dt>
					<label for="settingsGeneralWebserverPort">
						Port
						<div>The port this interface and the API routes are hosted on.</div>
					</label>
				</dt>
				<dd><input id="settingsGeneralWebserverPort" type="number" value="9600" /></dd>
			</dl>
		</section>
	</section>
	`;

};
