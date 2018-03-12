'use strict';

class View {
  constructor(viewName, props) {
    if (viewName.substring(0, 1) !== '/') {
      viewName = `/${viewName}`;
    }

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
        // get the complete view url
        const url = `/views${this.name}.js`;

        // check if the view actually exists using HttpRequest, so we have error handling
        const req = new XMLHttpRequest();
        req.open('GET', url, true);
        req.onload = () => {
          if (req.status >= 200 && req.status < 300) {
            // add the node
            const viewScriptNode = document.createElement('script');
            viewScriptNode.setAttribute('src', url);
            viewScriptNode.onload = () => {
              if (typeof View.routes[this.name] === 'function') {
                View.routes[this.name].call(this, this.element);
                resolve(this);
              } else {
                reject(`No such route: "${this.name}"`);
              }
            };
            document.head.appendChild(viewScriptNode);
          } else {
            reject(req.status);
          }
        };

        req.send();
      } else {
        View.routes[this.name].call(this, this.element);
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

class ViewHolder extends EventEmitter {
  constructor(node, rootPath = '/') {
    super();
    this.element = node;
    this.parentViewHolder = null;
    this.rootPath = rootPath;
    this.rootPaths = ViewHolder.splitPath(rootPath);
  }

  static splitPath(path) {
    let paths = path.split('/');
    if (paths[paths.length - 1] === '') {
      paths.pop();
    }
    return paths;
  }

  navigate(path, nonav) {
    history.pushState(null, path, path);

    if (nonav) {
      return Promise.resolve(this);
    }

    this.purge();

    // handle hash by simply removing it
    // history.pushState already set it correctly in the browser
    const pathHashIndex = path.indexOf('#');
    let pathHash;
    if (pathHashIndex > -1) {
      pathHash = path.substring(pathHashIndex);
      path = path.substring(0, pathHashIndex);
    }

    const paths = ViewHolder.splitPath(path);
    for (let i = 0; i < this.rootPaths.length; i += 1) {
      if (paths.length < i || paths[i] !== this.rootPaths[i]) {
        return Promise.resolve(this);
      }
    }

    // get and load the view
    const viewName = paths.slice(0, this.rootPaths.length + 1).join('/');
    const view = new View(viewName, this.getParams());
    this.render(view);

    return view.init()
    .then((view) => {
      // scroll to element with id === hash
      if (pathHash) {
        const el = document.getElementById(pathHash.substring(1));
        if (el) {
          el.scrollIntoView(true);
        }
      }

      this.emit('load', view);
      return view;
    })
    .catch((err) => {
      this.emit('error', err);
      return view;
    });
  }

  loadNav() {
    const path = window.location.pathname || '';
    const paths = ViewHolder.splitPath(path);

    if (paths.length === this.rootPaths.length) {
      return Promise.reject('already there');
    }

    return this.navigate(path + window.location.hash);
  }

  hookNavHandler() {
    window.addEventListener('popstate', (event) => this.loadNav());
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

  render(view) {
    this.element.appendChild(view.element);
    this.emit('render', view);
  }

  purge() {
    this.emit('purge');
    while (this.element.firstChild) {
      this.element.removeChild(this.element.firstChild);
    }
  }

  remove(view) {
    this.emit('remove', view);
    for (let i = 0; i < this.element.childNodes.length; i += 1) {
      if (this.element.childNodes[i].view === view) {
        this.element.removeChild(this.element.childNodes[i]);
        return true;
      }
    }

    return false;
  }
}
