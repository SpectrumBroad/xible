class XibleEditorFlow extends xibleWrapper.Flow {

	constructor(obj) {
		super(obj);
	}

	initNodes(nodes) {

		this.nodes = [];
		nodes.forEach((node) => this.addNode(new XibleEditorNode(node)));

	}

	initConnectors(connectors) {

		this.connectors = [];
		connectors.forEach((conn) => {

			conn.origin = this.getOutputById(conn.origin);
			conn.destination = this.getInputById(conn.destination);

			this.addConnector(new XibleEditorConnector(conn));

		});

	}

	undirect() {

		super.undirect();

		this.nodes.forEach((node) => {

			node.element.classList.remove('nodirect');

			if (node._directSetDataListener) {

				node.removeListener('setdata', node._directSetDataListener);
				delete node._directSetDataListener;

			}

		});

		this.connectors.forEach((connector) => {
			connector.element.classList.remove('nodirect');
		});

	}

	direct(related) {

		super.direct(related);

		//TODO: set related styling here instead of in XibleEditor where it is now

	}

	//TODO: simply have XibleEditor set viewState to loadedFlow directly?
	toJson(nodes, connectors) {

		//the viewstate
		this.setViewState({
			left: this.editor.left,
			top: this.editor.top,
			zoom: this.editor.zoom,
			backgroundLeft: this.editor.backgroundLeft,
			backgroundTop: this.editor.backgroundTop
		});

		super.toJson(nodes, connectors);

	}

}
