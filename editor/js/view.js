class View {

	constructor(viewName, props) {

		this.element = document.createElement('div');
		this.element.classList.add('view');
		this.element.view = this;
		this.properties = props || {};

		//load the view by its name from the views
		if (viewName) {

			if (!View.routes[viewName]) {

				//get the complete view url
				let url = `views/${viewName}.js`;

				//check if the view actually exists using HttpRequest, so we have error handling
				let req = new XMLHttpRequest();
				req.open('GET', url, true);
				req.onload = () => {

					if (req.status >= 200 && req.status < 300) {

						//add the node
						var viewScriptNode = document.createElement('script');
						viewScriptNode.setAttribute('src', url);
						viewScriptNode.onload = () => {

							if (typeof View.routes[viewName] === 'function') {
								View.routes[viewName].call(this);
							}

						};
						document.head.appendChild(viewScriptNode);

					}

				};

				req.send();

			} else {
				View.routes[viewName].call(this);
			}

		}

	}

	appendChild(node) {
		this.element.appendChild(node);
	}

}

View.routes = {};
View.defaultView = null;
View.loadHandler = null;
View.element = document.body;


class ViewHolder { //extends EventEmitter

	constructor(node) {

		//super();
		this.element = node;

	}

	hookHashHandler() {
		window.addEventListener('hashchange', () => this.loadHash());
	}

	loadHash() {

		this.purge();

		if (!window.location.hash) {
			return false;
		}

		let hash = window.location.hash.substring(1);
		let hashParams = hash.split('&');
		let viewName = hashParams[0];

		//populate the params
		let viewParams = {};
		hashParams.forEach((val) => {

			let valSplit = val.split('=');
			let param = valSplit[0],
				value = '';

			if (valSplit.length > 1) {

				value = valSplit.slice(1, valSplit.length).join('=');
				viewParams[param] = value;

			}

		});

		//create and activate the view
		this.render(new View(viewName, viewParams));

		return true;

	}

	render(view) {

		//this.emit('render', view);
		this.element.appendChild(view.element);

	}

	done(view) {
		//this.emit('done', view);
	}

	purge() {

		//this.emit('purge');
		while (this.element.firstChild) {
			this.element.removeChild(this.element.firstChild);
		}

	}

	remove(view) {

		//this.emit('remove', view);
		for (let i = 0; i < this.element.childNodes.length; i++) {

			if (this.element.childNodes[i].view === view) {

				this.element.removeChild(this.element.childNodes[i]);
				return true;

			}

		}

		return false;

	}

}
