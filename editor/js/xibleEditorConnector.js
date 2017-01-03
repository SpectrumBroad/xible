class XibleEditorConnector extends xibleWrapper.Connector {

	constructor(obj) {

		//create the connector HTML/SVG elements
		let el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		el.classList.add('connector');
		let path = el.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'path'));

		super(Object.assign({}, obj, {
			element: el
		}));

		//selection handlers
		path.addEventListener('mousedown', e => this.editor.toggleSelectionOnMouseEvent(e, this));
		path.addEventListener('mouseup', e => this.editor.toggleSelectionOnMouseEvent(e, this));

	}

	setType(type) {

		if (this.type) {
			this.element.firstChild.classList.remove(this.type);
		}

		super.setType(type);
		this.element.firstChild.classList.add(this.type);

	}

	filterDuplicateConnectors(type, end) {

		if (!window.dummyXibleConnectors || window.dummyXibleConnectors.indexOf(this) === -1) {
			super.filterDuplicateConnectors(type, end);
		}

	}

	setOrigin(origin) {

		if (this.origin && this.origin.connectors.indexOf(this) > -1) {
			this.origin.node.removeListener('position', this.originDrawFn);
		}

		super.setOrigin(origin);

		if(!origin) {
			return null;
		}

		this.draw();

		//redraw on move of origin
		this.origin.node.on('position', this.originDrawFn = this.draw.bind(this));

	}

	setDestination(destination) {

		if (this.destination && this.destination.connectors.indexOf(this) > -1) {

			this.destination.node.removeListener('position', this.destinationDrawFn);

			//find global conns with same type
			if (this.destination.connectors.length === 1 && this.destination.type && document.querySelector(`.output>.${this.destination.type.replace(/\./g,'\\.')}.global`)) {
				this.destination.setGlobal(true);
			}

		}

		super.setDestination(destination);

		if(!destination) {
			return null;
		}

		this.draw();

		//redraw on move of origin
		this.destination.node.on('position', this.destinationDrawFn = this.draw.bind(this));

	}

	draw() {

		let {
			element: el,
			origin,
			destination
		} = this;

		//only continue if both sides are known
		if (destination && origin) {
			el.style.visibility = '';
		} else {

			el.style.visibility = 'none';
			return false;

		}

		if (!el.parentNode) {
			return;
		}

		//get the position of the output
		let originNodeStyle = getComputedStyle(origin.node.element);
		let originLeft = origin.node.left + origin.element.offsetLeft + origin.element.offsetWidth + parseInt(originNodeStyle.borderLeftWidth) + parseInt(originNodeStyle.paddingLeft);
		let originTop = origin.node.top + origin.element.offsetTop;

		//get the position of the input
		let destinationNodeStyle = getComputedStyle(destination.node.element);
		let destinationLeft = destination.node.left + destination.element.offsetLeft + parseInt(destinationNodeStyle.borderLeftWidth) + parseInt(destinationNodeStyle.paddingLeft);
		let destinationTop = destination.node.top + destination.element.offsetTop;

		//get the distances between input and output
		let height = Math.abs(originTop - destinationTop);
		let width = Math.abs(originLeft - destinationLeft);

		//calculate the tension
		const maxTension = 100;
		const minTension = 0;
		let tension = Math.floor((width / 3) + (height / 3));

		if (originLeft - destinationLeft < 0) {
			tension = tension > maxTension ? maxTension : tension;
		}

		tension = tension < minTension ? minTension : tension;

		//update the path for the bezier curve
		let startX = destinationLeft > originLeft ? (tension / 2) : width + (tension / 2);
		let endX = destinationLeft > originLeft ? destinationLeft - originLeft + (tension / 2) : 0 + (tension / 2);
		let startY = destinationTop > originTop ? 10 : height + 10;
		let endY = destinationTop > originTop ? destinationTop - originTop + 10 : 10;
		el.firstChild.setAttribute('d', 'M' + startX + ',' + startY + ' C' + (startX + tension) + ',' + startY + ' ' + (endX - tension) + ',' + endY + ' ' + endX + ',' + endY);

		//get the bounding box for the bezier curve so we can size the parent svg element
		let pathBounding = el.firstChild.getBoundingClientRect();
		let pathWidth = (pathBounding.width / this.editor.zoom);

		//calc the x/y position of the svg element
		let left = ((originLeft < destinationLeft ? originLeft : destinationLeft));
		let top = (originTop < destinationTop ? originTop : destinationTop);

		//apply tension to left position of svg
		left -= (tension / 2);

		//update the location and size of the svg
		el.style.transform = `translate(${left}px, ${top}px)`;
		el.style.width = (width + tension) + 'px';
		el.style.height = (height + 20) + 'px';

		this.top = top;
		this.left = left;

	}

	delete() {

		super.delete();

		if (this.editor) {
			this.editor.deleteConnector(this);
		}

	}

}
