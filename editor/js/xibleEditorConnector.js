'use strict';

class XibleEditorConnector extends xibleWrapper.Connector {
  constructor(obj) {
    // create the connector HTML/SVG elements
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.classList.add('connector');
    const path = el.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'path'));

    super(Object.assign({}, obj, { element: el }));

    if (this.global) {
      el.classList.add('global');
    }

    // selection handlers
    path.addEventListener('mousedown', event => this.editor.toggleSelectionOnMouseEvent(event, this));
    path.addEventListener('mouseup', event => this.editor.toggleSelectionOnMouseEvent(event, this));
  }

  setType(type) {
    if (this.type) {
      this.element.firstChild.classList.remove(this.type);
    }

    super.setType(type);
    this.element.firstChild.classList.add(this.type);
  }

  filterDuplicateConnectors(type, end) {
    if (
      !this.editor || !this.editor.dummyXibleConnectors ||
      this.editor.dummyXibleConnectors.indexOf(this) === -1
    ) {
      super.filterDuplicateConnectors(type, end);
    }
  }

  setOrigin(origin) {
    if (this.origin && this.origin.connectors.indexOf(this) > -1) {
      this.origin.node.removeListener('position', this._originDrawFn);
    }

    super.setOrigin(origin);

    if (!origin) {
      return null;
    }

    this.draw();

    // redraw on move of origin
    this.origin.node.on('position', this._originDrawFn = this.draw.bind(this));

    return origin;
  }

  setDestination(destination) {
    if (this.destination && this.destination.connectors.indexOf(this) > -1) {
      this.destination.node.removeListener('position', this._destinationDrawFn);

      // find global conns with same type
      if (this.destination.global !== false && this.destination.connectors.length === 1 && this.destination.type && document.querySelector(`.output>.${this.destination.type.replace(/\./g, '\\.')}.global`)) {
        this.destination.setGlobal(true);
      }
    }

    super.setDestination(destination);

    if (!destination) {
      return null;
    }

    this.draw();

    // redraw on move of destination
    this.destination.node.on('position', this._destinationDrawFn = this.draw.bind(this));

    return destination;
  }

  /**
  * Recalculates and writes/draws all values of a connector,
  * relative to the start- and end-point.
  * @returns {Boolean} Returns false if no action was taken, true otherwise.
  */
  draw() {
    const { element: el, origin, destination } = this;

    // only continue if both sides are known
    if (destination && origin) {
      el.style.visibility = '';
    } else {
      el.style.visibility = 'none';
      return false;
    }

    if (!el.parentNode) {
      return false;
    }

    // get the position of the output
    const originNodeStyle = getComputedStyle(origin.node.element);
    const originLeft = origin.node.left + origin.element.offsetLeft + origin.element.offsetWidth +
      parseInt(originNodeStyle.borderLeftWidth, 10) +
      parseInt(originNodeStyle.paddingLeft, 10);
    const originTop = origin.node.top + origin.element.offsetTop;

    // get the position of the input
    const destinationNodeStyle = getComputedStyle(destination.node.element);
    const destinationLeft = destination.node.left + destination.element.offsetLeft +
      parseInt(destinationNodeStyle.borderLeftWidth, 10) +
      parseInt(destinationNodeStyle.paddingLeft, 10);
    const destinationTop = destination.node.top + destination.element.offsetTop;

    // get the distances between input and output
    const height = Math.abs(originTop - destinationTop);
    const width = Math.abs(originLeft - destinationLeft);

    // calculate the tension
    const maxTension = 100;
    const minTension = 0;
    let tension = Math.floor((width / 3) + (height / 3));

    if (originLeft - destinationLeft < 0) {
      tension = tension > maxTension
        ? maxTension
        : tension;
    }

    tension = tension < minTension
      ? minTension
      : tension;

    // update the path for the bezier curve
    const startX = destinationLeft > originLeft
      ? (tension / 2)
      : width + (tension / 2);
    const endX = destinationLeft > originLeft
      ? destinationLeft - originLeft + (tension / 2)
      : 0 + (tension / 2);
    const startY = destinationTop > originTop
      ? 10
      : height + 10;
    const endY = destinationTop > originTop
      ? destinationTop - originTop + 10
      : 10;
    el.firstChild.setAttribute('d', `M${startX},${startY} C${startX + tension},${startY} ${endX - tension},${endY} ${endX},${endY}`);

    // calc the x/y position of the svg element
    let left = originLeft < destinationLeft
      ? originLeft
      : destinationLeft;
    const top = (originTop < destinationTop
      ? originTop
      : destinationTop) + 1;

    // apply tension to left position of svg
    left -= (tension / 2);

    // update the location and size of the svg
    el.style.transform = `translate(${left}px, ${top}px)`;
    el.style.width = `${width + tension}px`;
    el.style.height = `${height + 20}px`;

    this.top = top;
    this.left = left;

    return true;
  }

  delete() {
    super.delete();

    if (this.editor) {
      this.editor.deleteConnector(this);
    }
  }
}
