class View {

	constructor(viewName, props) {

		this.name = viewName;
		this.element = document.createElement('div');
		this.element.classList.add('view');
		this.style = this.element.style;
		this.classList = this.element.classList;

		this.element.view = this;
		this.properties = props || {};

	}

	init() {

		return new Promise((resolve, reject) => {

			if (!View.routes[this.name]) {

				//get the complete view url
				let url = `views/${this.name}.js`;

				//check if the view actually exists using HttpRequest, so we have error handling
				let req = new XMLHttpRequest();
				req.open('GET', url, true);
				req.onload = () => {

					if (req.status >= 200 && req.status < 300) {

						//add the node
						var viewScriptNode = document.createElement('script');
						viewScriptNode.setAttribute('src', url);
						viewScriptNode.onload = () => {

							if (typeof View.routes[this.name] === 'function') {
								View.routes[this.name].call(this);
							}

						};
						document.head.appendChild(viewScriptNode);

						resolve(this);

					} else {
						reject(req.status);
					}

				};

				req.send();

			} else {
				View.routes[viewName].call(this);
				resolve(this);
			}

		});

	}

	appendChild(node) {
		return this.element.appendChild(node);
	}

	removeChild(node) {
		return this.element.removeChild(node);
	}

}


View.routes = {};


class ViewHolder { //extends EventEmitter

	constructor(node) {

		//super();
		this.element = node;
		this.parentViewHolder = null;

	}

	navigate(path, nonav) {

		let deepIndex = 0;
		/*
		if (this.parentViewHolder) {
			deepIndex = this.parentViewHolder.navigate(path, nonav);
		}
		*/

		history.pushState(null, path, path);
		if (!nonav) {

			this.purge();

			let paths = path.substring(1).split('/');
			let view = new View(paths[deepIndex], this.getParams());
			this.render(view);

			return view.init();

		}

		return Promise.resolve(this);

	}

	loadNav() {

		let path = window.location.pathname;
		if (!path || path === '/') {
			return Promise.reject('already root');
		}

		return this.navigate(path);

	}

	hookNavHandler() {

		window.addEventListener('popstate', (event) => {
			this.loadNav();
		});

	}

	hookHashHandler() {
		window.addEventListener('hashchange', () => this.loadHash());
	}

	getParams(str) {

		let queryParams = str;

		if (!queryParams) {

			if (!window.location.search) {
				return {};
			}
			queryParams = window.location.search.substring(1);

		}

		let viewParams = {};
		queryParams.forEach((val) => {

			let valSplit = val.split('=');
			let param = valSplit[0],
				value = '';

			if (valSplit.length > 1) {

				value = valSplit.slice(1, valSplit.length).join('=');
				viewParams[param] = value;

			}

		});

		return params;

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
		let viewParams = this.getParams(hash);

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
