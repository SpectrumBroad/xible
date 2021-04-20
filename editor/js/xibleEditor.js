'use strict';

class XibleEditor extends EventEmitter {
  constructor(xibleWrapper) {
    super();

    this.xibleWrapper = xibleWrapper;

    // remove all editor statuses when connection closes
    xibleWrapper.on('close', this._xibleWrapperCloseListener = () => {
      if (!this.loadedFlow) {
        return;
      }
      this.loadedFlow.removeAllStatuses();
    });

    xibleWrapper.on('message', this._xibleWrapperMessageListener = (message) => {
      this.messageHandler(message);
    });

    // stage element
    this.element = document.createElement('div');
    this.element.classList.add('xible');
    this.element.appendChild(document.createElement('div'));
    this.element.firstChild.classList.add('editor');
    this.element.firstChild.style.transformOrigin = '0 0';

    // check for browser support
    this.browserSupportItems = {
      attachShadow: typeof this.element.attachShadow === 'function',
      templateElement: 'content' in document.createElement('template'),
      scriptModule: 'noModule' in document.createElement('script')
    };
    this.browserSupport = true;
    for (const item in this.browserSupportItems) {
      if (!this.browserSupportItems[item]) {
        this.browserSupport = false;
        break;
      }
    }

    this.gridSize = 50;

    this.selection = [];
    this.copySelection = null;

    this.nodeDragHasFired = false;
    this.nodeDragListener = null;
    this.nodeDragUpListener = null;
    this.nodeDragSpliceConnector = false;

    this.areaMoveListener = null;

    this.dummyXibleConnectors = null;
    this.dummyXibleNode = null;
    this.dummyIo = null;

    this.flows = {};
    this.loadedFlow = null;

    this.typeDefStyleEl = null;

    // check how far the clocks of server and client are off from eachother
    // in ms
    this.serverClientDateDifference = 0;
    xibleWrapper.getServerClientDateDifference()
    .then((ms) => { this.serverClientDateDifference = ms; });

    this.enableNodeSelector();
    this.enableZoom();
    this.enableHook();
    this.enableSelection();
    this.enablePan();
  }

  describeNode(node) {
    if (!(node instanceof XibleEditorNode)) {
      throw new Error('1st argument must be a XibleEditorNode');
    }

    node = node.duplicate(true);

    node.emit('beforeAppend');

    const describeEl = this.element.appendChild(document.createElement('div'));
    describeEl.classList.add('describe');

    // close button
    const closeButton = describeEl.appendChild(document.createElement('button'));
    closeButton.setAttribute('type', 'button');
    closeButton.appendChild(document.createTextNode('X'));
    closeButton.onclick = () => {
      this.element.removeChild(describeEl);
    };

    // ignore default xible container event handlers
    describeEl.addEventListener('wheel', (event) => {
      event.stopPropagation();
    });

    describeEl.addEventListener('mousedown', (event) => {
      event.stopPropagation();
    });

    describeEl.addEventListener('mouseup', (event) => {
      event.stopPropagation();
    });

    describeEl.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    // append the node descriptionEl
    const descriptionEl = describeEl.appendChild(document.createElement('p'));
    descriptionEl.appendChild(document.createTextNode(node.description || 'not described'));

    if (!node.description) {
      descriptionEl.classList.add('none');
    }

    // append the node
    node.setPosition(0, 0);
    node.element.style.transform = '';

    // append the node type information
    /*
    let typeEl = node.element.querySelector('h1').appendChild(document.createElement('p'));
    typeEl.appendChild(document.createElement('span')).appendChild(document.createTextNode(node.type));

    if(node.type === 'action') {
      typeEl.appendChild(document.createTextNode('Double-click this header in the flow overview to start it in directed mode.'));
    }
    */

    // we need to append early because the offsetHeight/scrollHeight of
    // the description els are required to check for overflow
    describeEl.appendChild(node.element);

    // add the description for each io
    node.getInputs()
    .concat(node.getOutputs())
    .forEach((io) => {
      // get rid of event listeners
      const clonedNode = io.element.cloneNode(true);
      io.element.parentNode.replaceChild(clonedNode, io.element);
      io.element = clonedNode;

      // add description
      const ioDescriptionEl = io.element.appendChild(document.createElement('p'));
      ioDescriptionEl.appendChild(document.createElement('span')).appendChild(document.createTextNode(io.structureType || 'any'));
      ioDescriptionEl.appendChild(document.createTextNode(io.description || 'not described'));

      if (!io.description) {
        ioDescriptionEl.classList.add('none');
      }

      if (ioDescriptionEl.scrollHeight > ioDescriptionEl.offsetHeight) {
        ioDescriptionEl.classList.add('overflow');
      }
    });

    // handle descriptions for input elements and labels
    node.on('editorContentLoad', () => {
      if (!node.shadowRoot) {
        return;
      }

      // add the description for each input element
      node.getRootLabelElements()
      .forEach((label) => {
        const description = label.getAttribute('data-description');

        // this is actually not allowed
        // a label may not contain a block element
        const labelDescriptionEl = label.appendChild(document.createElement('p'));
        labelDescriptionEl.appendChild(document.createTextNode(description || 'not described'));

        if (!description) {
          labelDescriptionEl.classList.add('none');
        }

        if (labelDescriptionEl.scrollHeight > labelDescriptionEl.offsetHeight) {
          labelDescriptionEl.classList.add('overflow');
        }
      });
    });

    node.editor = this;
    node.emit('append');
  }

  disableNodeSelector() {
    if (this.nodeSelector) {
      this.nodeSelector.destroy();
    }
  }

  enableNodeSelector() {
    this.nodeSelector = new XibleEditorNodeSelector(this);
  }

  /**
  * Gets the flows from the Xible API
  */
  getFlows() {
    const req = this.xibleWrapper.http.request('GET', '/api/flows');
    return req.toObject(Object)
    .then((flows) => {
      this.flows = {};
      for (const flowId in flows) {
        const flow = new XibleEditorFlow(flows[flowId]);
        this.flows[flowId] = flow;
      }

      return this.flows;
    });
  }

  /**
  * Loads the style information (color) associated with typeDefs
  */
  loadTypeDefStyles() {
    xibleWrapper.TypeDef.getAll()
    .then((typeDefs) => {
      // remove existing style el
      if (this.typeDefStyleEl && this.typeDefStyleEl.parentNode) {
        this.typeDefStyleEl.parentNode.removeChild(this.typeDefStyleEl);
      }

      // create new style el
      this.typeDefStyleEl = document.createElement('style');
      this.typeDefStyleEl.setAttribute('type', 'text/css');
      let styleText = '';
      for (const type in typeDefs) {
        if (typeDefs[type].color &&
          (
            /^\w+$/.test(typeDefs[type].color) ||
            /^#[a-f0-9]{6}$/i.test(typeDefs[type].color)
          )
        ) {
          styleText += `.xible .node>.io>ul>.${type.replace(/\./g, '\\.')} {border-color: ${typeDefs[type].color};}\n`;
        }
      }
      if (!styleText) {
        return;
      }

      // add to head
      this.typeDefStyleEl.appendChild(document.createTextNode(styleText));
      const head = document.head || document.getElementsByTagName('head')[0];
      head.appendChild(this.typeDefStyleEl);
    });
  }

  /**
  * Handles a message from xibleWrapper
  * @param {Object} json The message Object
  */
  messageHandler(json) {
    if (!this.loadedFlow) {
      return;
    }

    // get the node for this message
    let node;
    if (json.nodeId) {
      node = this.loadedFlow.getNodeById(json.nodeId);
      if (!node) {
        return;
      }
    }

    if (json.flowId && !this.flows[json.flowId]) {
      return;
    }

    switch (json.method) {
      case 'xible.flow.instance.removeAllStatuses':
        if (json.flowId === this.loadedFlow._id) {
          this.loadedFlow.removeAllStatuses();
        }
        break;

      // TODO: this needs to be handled by the view, not XibleEditor.
      // TODO: Should take time from the log record (which does not exist right now).
      case 'xible.flow.instance.error':
        if (json.flowId === this.loadedFlow._id) {
          const logUl = document.querySelector('#log ul');
          const logLi = document.createElement('li');
          logUl.appendChild(logLi);
          logLi.classList.add('red');

          const dateSpan = logLi.appendChild(document.createElement('span'));
          dateSpan.classList.add('date');
          dateSpan.innerHTML = new Date().toLocaleString();

          if (json.error.stack) {
            logLi.appendChild(document.createTextNode(json.error.stack));
          } else {
            logLi.appendChild(document.createTextNode(`${json.error.constructorName} ${json.error.message}`));
          }

          logLi.scrollIntoView(false);
        }
        break;

      case 'xible.node.addStatus': {
        node.addStatus(json.status);

        // TODO: Should take time from the log record (which does not exist right now).
        // TODO: this needs to be handled by the view, not XibleEditor.
        const logUl = document.querySelector('#log ul');
        const logLi = document.createElement('li');
        logUl.appendChild(logLi);

        if (json.status.color) {
          logLi.classList.add(json.status.color);
        }

        const dateSpan = logLi.appendChild(document.createElement('span'));
        dateSpan.classList.add('date');
        dateSpan.innerHTML = new Date().toLocaleString();

        logLi.appendChild(document.createTextNode(json.status.message));

        logLi.scrollIntoView(false);
        break;
      }

      case 'xible.node.updateStatusById':
        node.updateStatusById(json.status._id, json.status);
        break;

      case 'xible.node.addProgressBar':
        node.addProgressBar(json.status);
        break;

      case 'xible.node.updateProgressBarById':
        node.updateProgressBarById(json.status._id, json.status);
        break;

      case 'xible.node.removeStatusById':
        node.removeStatusById(json.status._id, json.status.timeout);
        break;

      case 'xible.node.removeAllStatuses':
        node.removeAllStatuses();
        break;

      case 'xible.node.setTracker':
        node.setTracker(json.status);
        break;

      case 'xible.flow.usage':
        this.emit('flow.usage', json.usage);
        break;
    }
  }

  /**
  * Returns a Flow by the given id, or undefined if not found
  * @param {Number}
  * @return {XibleEditorFlow|Void} The found Flow
  */
  getFlowById(id) {
    return this.flows.find(flow => flow._id === id);
  }

  /**
  * Appends the given Node to the Editor
  * @param {XibleEditorNode} node The Node to add
  * @return {XibleEditorNode} The given Node
  */
  addNode(node) {
    node.emit('beforeAppend');

    this.element.firstChild.appendChild(node.element);
    node.editor = this;

    // global inputs
    // FIXME: move this to the XibleFlow def and track all global outputs there
    let globalTypes = [].concat(...this.loadedFlow.nodes.map(node => node.getGlobalOutputs()
    .map(output => output.type)));

    node.getInputs()
    .forEach((input) => {
      let globalValue = input.global;
      if (
        globalTypes.indexOf(input.type) > -1 &&
        !input.connectors.length && input.global !== false
      ) {
        globalValue = true;
      }
      input.setGlobal(globalValue);
    });

    // global outputs
    node.getGlobalOutputs()
    .forEach((output) => {
      this.loadedFlow.setGlobalFromOutput(output);
    });

    globalTypes = null;

    node.emit('append');

    return node;
  }

  /**
  * Append a Connector to the Editor
  * @param {XibleEditorConnector} connector The Connector to add
  * @return {XibleEditorConnector} The given connector
  */
  addConnector(connector) {
    connector.editor = this;
    this.element.firstChild.appendChild(connector.element);
    connector.draw();

    return connector;
  }

  /**
  * Remove a Node or Connector from the Editor
  * @param {(XibleEditorNode|XibleEditorConnector)} obj The object to remove
  */
  deleteChild(obj) {
    if (obj instanceof XibleEditorNode) {
      this.deleteNode(obj);
    } else if (obj instanceof XibleEditorConnector) {
      this.deleteConnector(obj);
    }
  }

  /**
  * Remove a Node from the Editor
  * @param {XibleEditorNode} node The Node to remove
  */
  deleteNode(node) {
    const nodeIndex = this.loadedFlow.nodes.indexOf(node);
    if (nodeIndex > -1) {
      this.loadedFlow.nodes.splice(nodeIndex, 1);
    }

    this.deselect(node);

    // check for globals
    const globalOutputs = node.getGlobalOutputs();
    for (let i = 0; i < globalOutputs.length; i += 1) {
      globalOutputs[i].setGlobal(false);
    }

    node.editor = null;

    // remove from dom
    if (node.element.parentNode) {
      this.element.firstChild.removeChild(node.element);
    }
  }

  /**
  * Remove a Connector from the Editor
  * @param {XibleEditorConnector} connector The Connector to remove
  */
  deleteConnector(connector) {
    const connectorIndex = this.loadedFlow.connectors.indexOf(connector);
    if (connectorIndex > -1) {
      this.loadedFlow.connectors.splice(connectorIndex, 1);
    }

    this.deselect(connector);

    connector.editor = null;

    // remove from dom
    if (connector.element.parentNode) {
      this.element.firstChild.removeChild(connector.element);
    }
  }

  /**
  * Opens the given flow in the editor.
  * Does nothing if that flow is already loaded.
  * @param {XibleEditorFlow} flow The flow to open/view/edit.
  * @returns {Boolean} False if this flow is already loaded, true otherwise.
  */
  viewFlow(flow) {
    if (!(flow instanceof XibleEditorFlow)) {
      throw new Error('not a flow');
    }

    // don't reload an already loaded flow
    if (this.loadedFlow && this.loadedFlow._id === flow._id) {
      return false;
    }

    // unload already loaded flow
    if (this.loadedFlow) {
      this.loadedFlow.removeAllStatuses();
      this.loadedFlow.editor = null;
    }

    // clean
    this.element.firstChild.innerHTML = '';

    flow.editor = this;
    this.loadedFlow = flow;
    this.element.setAttribute('data-flow', flow._id);

    // setup the nodes
    flow.nodes.forEach((node) => {
      this.addNode(node);
    });

    // setup the connectors
    flow.connectors.forEach((connector) => {
      this.addConnector(connector);
    });

    // setup the viewstate
    this.left = flow.viewState.left;
    this.top = flow.viewState.top;
    this.zoom = flow.viewState.zoom;
    this.backgroundLeft = flow.viewState.backgroundLeft;
    this.backgroundTop = flow.viewState.backgroundTop;
    this.transform();

    this.emit('viewflow');
    return true;
  }

  /**
  * Returns the non-transformed offset position.
  */
  getOffsetPosition() {
    let el = this.element.firstChild;
    let actionsOffsetTop = 0;
    let actionsOffsetLeft = 0;

    do {
      actionsOffsetTop += el.offsetTop;
      actionsOffsetLeft += el.offsetLeft;
    } while (el = el.offsetParent);

    return {
      left: actionsOffsetLeft,
      top: actionsOffsetTop
    };
  }

  /**
  * Transforms the element according to the object properties.
  */
  transform() {
    this.element.firstChild.style.transform = `translate(${this.left}px, ${this.top}px) scale(${this.zoom})`;
    this.element.style.backgroundPosition = `${this.backgroundLeft}px ${this.backgroundTop}px`;
  }

  /**
  * Deselect everything if no arguments provided, or remove just the first argument.
  * @param {(XibleEditorNode|XibleEditorConnector)} [obj]
  * The Node or Connector to remove from the selection.
  */
  deselect(obj) {
    if (obj) {
      const selectionIndex = this.selection.indexOf(obj);
      if (selectionIndex > -1) {
        this.selection.splice(selectionIndex, 1);
        obj.element.classList.remove('selected');
      }

      return;
    }

    for (let i = 0; i < this.selection.length; i += 1) {
      this.selection[i].element.classList.remove('selected');
    }

    this.selection = [];
  }

  /**
  * Decides what to do with the selection, based on an event.
  * Example: adds node to the selection when ctrl is pressed and a node is clicked.
  * @param {Event} event The event taking place.
  * @param {(XibleEditorNode|XibleEditorConnector)} [obj] New Node or Connector.
  */
  toggleSelectionOnMouseEvent(event, obj) {
    if (event.button === 1) {
      return;
    }

    const selectionIndex = this.selection.indexOf(obj);

    if (!event.ctrlKey && !event.metaKey && event.type === 'mousedown' && selectionIndex === -1) {
      this.deselect();
      this.selection.push(obj);
      obj.element.classList.add('selected');
    } else if ((event.ctrlKey || event.metaKey) && event.type === 'mouseup' && selectionIndex === -1 && !this.nodeDragHasFired) {
      this.selection.push(obj);
      obj.element.classList.add('selected');
    } else if (!event.ctrlKey && !event.metaKey && event.type === 'mouseup' && selectionIndex > -1 && !this.nodeDragHasFired) {
      this.deselect();
      this.selection.push(obj);
      obj.element.classList.add('selected');
    } else if ((event.ctrlKey || event.metaKey) && event.type === 'mouseup' && selectionIndex > -1 && !this.nodeDragHasFired) {
      this.deselect(obj);
    }
  }

  /**
  * Adds a Node or Connector to the selection.
  * @param {(XibleEditorNode|XibleEditorConnector)} obj The Node or Connector to add.
  */
  select(obj) {
    const selectionIndex = this.selection.indexOf(obj);

    if (selectionIndex === -1) {
      this.selection.push(obj);
      obj.element.classList.add('selected');
    }
  }

  /**
  * Inits a drag of the selection (after mousedown).
  * @param {Event} event The (mouse)event for the drag.
  */
  initDrag(event) {
    // exit if we're already dragging
    if (this.nodeDragListener || !this.selection.length) {
      return;
    }

    // init the start positions of the drag
    let initPageX = event.pageX;
    let initPageY = event.pageY;
    this.nodeDragHasFired = false;

    // get all the connectors for the selected node
    // so we can check if we are not splicing a connector for the selected node
    // because that wouldn't make sense
    const selNodeConnectors = [];
    let selNode;
    if (this.selection.length === 1 && this.selection[0] instanceof XibleEditorNode) {
      selNode = this.selection[0];

      selNode.getInputs().concat(selNode.getOutputs()).forEach((io) => {
        selNodeConnectors.push(...io.connectors);
      });
    }

    if (typeof this.gridSize === 'number' && this.gridSize > 0) {
      document.body.addEventListener('mouseup', this.nodeDragUpListener = () => {
        if (this.nodeDragUpListener) {
          document.body.removeEventListener('mouseup', this.nodeDragUpListener);
          this.nodeDragUpListener = null;
        }

        if (!this.nodeDragHasFired) {
          return;
        }

        for (const sel of this.selection) {
          if (typeof (sel.setPosition) === 'function') {
            sel.setPosition(
              Math.round(sel.left / this.gridSize) * this.gridSize,
              Math.round(sel.top / this.gridSize) * this.gridSize
            );
          }
        }
      });
    }

    // catch the mousemove event
    document.body.addEventListener('mousemove', this.nodeDragListener = (mouseMoveEvent) => {
      // check if mouse actually moved
      // see crbug.com/327114
      if (initPageX === mouseMoveEvent.pageX && initPageY === mouseMoveEvent.pageY) {
        return;
      }

      mouseMoveEvent.preventDefault();

      this.nodeDragHasFired = true;

      // check how much we moved since the initial mousedown event
      const relativePageX = (mouseMoveEvent.pageX - initPageX) / this.zoom;
      const relativePageY = (mouseMoveEvent.pageY - initPageY) / this.zoom;

      // save the values for the next trigger of this function
      initPageX = mouseMoveEvent.pageX;
      initPageY = mouseMoveEvent.pageY;

      // update position of each of the selection items that cares
      for (const sel of this.selection) {
        if (typeof (sel.setPosition) === 'function') {
          sel.setPosition(sel.left + relativePageX, sel.top + relativePageY);
        }
      }

      // check if the selection is hovering a connector that it could be part of
      if (this.selection.length === 1 && this.selection[0] instanceof XibleEditorNode) {
        const selBounding = selNode.element.getBoundingClientRect();
        const selLeftAvg = selNode.left + (selBounding.width / this.zoom) / 2;
        const selTopAvg = selNode.top + (selBounding.height / this.zoom) / 2;

        const previousSpliceConnector = this.nodeDragSpliceConnector;

        const hasSpliceConnector = this.loadedFlow.connectors.some((connector) => {
          // ignore hovering over connectors that are connected to the selected node
          if (selNodeConnectors.indexOf(connector) > -1) {
            return false;
          }

          if (
            (
              selNode.getInputsByType(connector.origin.type).length ||
              (connector.origin.type !== 'trigger' && selNode.getInputsByType(null).length)
            ) &&
            (
              selNode.getOutputsByType(connector.origin.type).length ||
              (connector.destination.type !== 'trigger' && selNode.getOutputsByType(null).length) ||
              (
                selNode.outputs.length &&
                !connector.destination.type &&
                selNode.outputs.length > selNode.getOutputsByType('trigger').length
              )
            )
          ) {
            const connBounding = connector.element.getBoundingClientRect();
            if (
              Math.abs((connector.left + (connBounding.width / this.zoom) / 2) - selLeftAvg) < 20 &&
              Math.abs((connector.top + (connBounding.height / this.zoom) / 2) - selTopAvg) < 20
            ) {
              this.nodeDragSpliceConnector = connector;
              connector.element.classList.add('splice');
              selNode.element.classList.add('splice');
              return true;
            }
          }
          return false;
        });

        if (!hasSpliceConnector) {
          this.nodeDragSpliceConnector = null;
          selNode.element.classList.remove('splice');
        }

        if (
          previousSpliceConnector &&
          (!hasSpliceConnector || previousSpliceConnector !== this.nodeDragSpliceConnector)
        ) {
          previousSpliceConnector.element.classList.remove('splice');
        }
      }
    });
  }

  /**
  * Starts an area selector based on a mouse event.
  * @param  {Event} event The (mouse)event which triggered the area selector.
  */
  initAreaSelector(event) {
    // exit if we're already dragging
    if (this.areaMoveListener) {
      return;
    }

    // deselect previous selection
    if (!event.ctrlKey && !event.metaKey) {
      this.deselect();
    }

    // init the start positions of the drag
    const initPageX = event.pageX;
    const initPageY = event.pageY;

    // get the xible position
    const xibleBounding = this.element.getBoundingClientRect();
    const areaElLeft = initPageX - xibleBounding.left;
    const areaElTop = initPageY - xibleBounding.top;

    // create the area element
    let areaEl;
    const boundings = new Map();

    // store the selected nodes
    const selectedNodes = new Set();
    const alreadySelectedNodes = new Set(this.selection);

    // catch the mousemove event
    document.body.addEventListener('mousemove', this.areaMoveListener = (mouseMoveEvent) => {
      if (!this.loadedFlow) {
        return;
      }

      mouseMoveEvent.preventDefault();

      // check how much we moved since the initial mousedown event
      let relativePageX = mouseMoveEvent.pageX - initPageX;
      let relativePageY = mouseMoveEvent.pageY - initPageY;

      if (Math.abs(relativePageY) < 3 && Math.abs(relativePageX) < 3) {
        return;
      } else if (!areaEl) {
        areaEl = document.createElement('div');
        areaEl.classList.add('area');
        areaEl.style.transform = `translate(${areaElLeft}px, ${areaElTop}px)`;
        this.element.appendChild(areaEl);

        // populate the boundings
        for (let i = 0; i < this.loadedFlow.nodes.length; i += 1) {
          const node = this.loadedFlow.nodes[i];
          const nodeBounding = node.element.getBoundingClientRect();
          boundings.set(node, {
            nodeLeftAvg: nodeBounding.left + nodeBounding.width / 2,
            nodeTopAvg: nodeBounding.top + nodeBounding.height / 2
          });
        }
      }

      // the left and top position of the area element compared to the document/page
      let areaElPageLeft = initPageX;
      let areaElPageTop = initPageY;

      // allow for negative selections
      if (relativePageX < 0 || relativePageY < 0) {
        let absAreaElLeft = areaElLeft;
        let absAreaElTop = areaElTop;

        if (relativePageX < 0) {
          absAreaElLeft += relativePageX;
          areaElPageLeft += relativePageX;
        }

        if (relativePageY < 0) {
          absAreaElTop += relativePageY;
          areaElPageTop += relativePageY;
        }

        areaEl.style.transform = `translate(${absAreaElLeft}px, ${absAreaElTop}px)`;

        relativePageX = Math.abs(relativePageX);
        relativePageY = Math.abs(relativePageY);
      }

      // adjust the size of the selection area
      areaEl.style.width = `${relativePageX}px`;
      areaEl.style.height = `${relativePageY}px`;

      // deselect all previously selected nodes in this area
      for (const selectedNode of selectedNodes) {
        this.deselect(selectedNode);
      }
      selectedNodes.clear();

      // check what nodes fall within the selection
      for (let i = 0; i < this.loadedFlow.nodes.length; i += 1) {
        const node = this.loadedFlow.nodes[i];
        const nodeBounding = boundings.get(node);
        const nodeLeftAvg = nodeBounding.nodeLeftAvg;
        const nodeTopAvg = nodeBounding.nodeTopAvg;

        if (
          nodeLeftAvg > areaElPageLeft && nodeLeftAvg < areaElPageLeft + relativePageX &&
          nodeTopAvg > areaElPageTop && nodeTopAvg < areaElPageTop + relativePageY
        ) {
          if (alreadySelectedNodes.has(node)) {
            selectedNodes.delete(node);
            this.deselect(node);
          } else {
            selectedNodes.add(node);
            this.select(node);
          }
        } else if (alreadySelectedNodes.has(node) && !this.selection.includes(node)) {
          selectedNodes.add(node);
          this.select(node);
        }
      }
    });
  }

  disableSelection() {
    document.body.removeEventListener('mousedown', this._selectionMouseDownListener);
    document.body.removeEventListener('mousedown', this._selectionMouseUpListener);
    document.body.removeEventListener('keydown', this._selectionKeyDownListener);
  }

  /**
  * This methods enables the ability of selecting items in the editor.
  */
  enableSelection() {
    // mousedown
    document.body.addEventListener('mousedown', this._selectionMouseDownListener = (event) => {
      if (!this.loadedFlow || event.button !== 0 || event.shiftKey) {
        return;
      }

      if (this.element !== event.target && !this.element.contains(event.target)) {
        this.deselect();
        return;
      }

      // area selector
      if (
        (!this.selection.length || event.ctrlKey || event.metaKey) &&
        (event.target === this.element || event.target === this.element.firstChild)
      ) {
        this.initAreaSelector(event);
      } else if (!XibleEditor.isInputElement(event.target)) { // drag handler
        this.initDrag(event);
      } else {
        this.deselect();
      }
    });

    // mouseup
    document.body.addEventListener('mouseup', this._selectionMouseUpListener = (event) => {
      if (!this.loadedFlow) {
        return;
      }

      if ((!this.nodeDragListener || !this.nodeDragHasFired) && !this.element.classList.contains('panning')) {
        // deselect
        if (
          (event.target === this.element.firstChild || event.target === this.element) &&
          !event.ctrlKey && !event.metaKey && event.button === 0
        ) {
          this.deselect();
        }
      }

      // complete the selection after an area select
      if (this.areaMoveListener) {
        document.body.removeEventListener('mousemove', this.areaMoveListener);
        this.areaMoveListener = null;

        const areaEl = document.querySelector('.xible .area');
        if (areaEl) {
          areaEl.parentNode.removeChild(areaEl);
        }
      }

      if (!this.nodeDragListener) {
        return;
      }

      document.body.removeEventListener('mousemove', this.nodeDragListener);
      this.nodeDragListener = null;

      // splice a connector
      if (this.nodeDragSpliceConnector) {
        const selNode = this.selection[0];
        const origConnectorDestination = this.nodeDragSpliceConnector.destination;

        selNode.element.classList.remove('splice');
        this.nodeDragSpliceConnector.element.classList.remove('splice');

        // connect the connector to the first input of type of the selected node
        let selInputs = selNode.getInputsByType(this.nodeDragSpliceConnector.origin.type);
        if (!selInputs.length) {
          selInputs = selNode.getInputsByType(null);
        }
        const selInput = selInputs[0];
        this.nodeDragSpliceConnector.setDestination(selInput);

        // connect a duplicate of the connector to the first output of type of the selected node
        const dupConn = new XibleEditorConnector();
        this.loadedFlow.connectors.push(dupConn);

        let selOutputs = selNode.getOutputsByType(this.nodeDragSpliceConnector.origin.type);
        let selOutput;
        if (!selOutputs.length) {
          selOutputs = selNode.getOutputsByType(null);
          if (selOutputs.length) {
            selOutput = selOutputs[0];
          } else {
            selOutput = selNode.outputs.find(output => output.type !== 'trigger');
          }
        } else {
          selOutput = selOutputs[0];
        }

        dupConn.setOrigin(selOutput);
        dupConn.setDestination(origConnectorDestination);

        this.addConnector(dupConn);

        this.nodeDragSpliceConnector = null;
      }
    });

    // key handlers
    document.body.addEventListener('keydown', this._selectionKeyDownListener = (event) => {
      if (!this.loadedFlow || XibleEditor.isInputElement(event.target)) {
        return;
      }

      switch (event.key) {
        // remove selection on delete or backspace
        case 'Delete':
        case 'Backspace':
          while (this.selection.length) {
            this.selection[0].delete();
          }
          event.preventDefault();

          break;

          // select all
        case 'a':
          if (event.ctrlKey || event.metaKey) {
            this.loadedFlow.nodes
            .forEach(node => this.select(node));
            this.loadedFlow.connectors
            .forEach(connector => this.select(connector));

            event.preventDefault();
          }

          break;

          // deselect all
        case 'd':
          if (event.ctrlKey || event.metaKey) {
            this.deselect();
            event.preventDefault();
          }

          break;

          // deselect all
        case 'Escape':
          this.deselect();
          event.preventDefault();

          break;

          // duplicate layers
        case 'j':
          if (event.ctrlKey || event.metaKey) {
            this.duplicateToEditor(this.selection);
            event.preventDefault();
          }

          break;

          // cut
        case 'x':
          if ((event.ctrlKey || event.metaKey) && this.selection.length) {
            this.copySelection = this.duplicate(this.selection);
            while (this.selection.length) {
              this.selection[0].delete();
            }

            event.preventDefault();
          }

          break;

          // copy
        case 'c':
          if ((event.ctrlKey || event.metaKey) && this.selection.length) {
            this.copySelection = this.duplicate(this.selection);
            event.preventDefault();
          }

          break;

          // paste
        case 'v':
          if ((event.ctrlKey || event.metaKey) && this.copySelection) {
            // TODO: ensure paste is in view
            this.duplicateToEditor(this.copySelection);

            event.preventDefault();
          }

          break;

          // help
        case 'h':
        case '?':
          if (this.selection.length === 1 && this.selection[0] instanceof XibleEditorNode) {
            this.describeNode(this.selection[0]);
            event.preventDefault();
          }

          break;

          // save
        case 's':
          if (event.ctrlKey || event.metaKey) {
            this.loadedFlow.save();
            event.preventDefault();
          }

          break;
      }
    });
  }

  /**
  * Duplicates the given selection in the editor.
  * Repositions the duplicated selection by x+20px, y+20px.
  * @param {(XibleEditorNode|XibleEditorConnector)[]} [selection=] the selection to duplicate.
  */
  duplicateToEditor(selection = this.selection) {
    const duplicates = this.duplicate(selection);

    // add the nodes
    duplicates.forEach((dup) => {
      if (!(dup instanceof XibleEditorNode)) {
        return;
      }

      // TODO: check if there's already an element at this position (within 20px radius)
      // reposition if true
      dup.setPosition(dup.left + 20, dup.top + 20);

      this.loadedFlow.addNode(dup);
      this.addNode(dup);
    });

    // add the connectors
    duplicates.forEach((dup) => {
      if (!(dup instanceof XibleEditorConnector)) {
        return;
      }

      if (
        !this.loadedFlow.nodes.includes(dup.origin.node) ||
        !this.loadedFlow.nodes.includes(dup.destination.node)
      ) {
        return;
      }

      this.loadedFlow.addConnector(dup);
      this.addConnector(dup);
    });

    // select the duplicates
    this.deselect();
    duplicates.forEach(dup => this.select(dup));
  }

  /**
  * Duplicates the given selection and returns that duplication as an array.
  * @param {(XibleEditorNode|XibleEditorConnector)[]} [selection=] Selection to duplicate.
  */
  duplicate(selection = this.selection) {
    const newSelection = [];
    const dupMap = {};

    selection.forEach((sel) => {
      if (!(sel instanceof XibleEditorNode)) {
        return;
      }

      const dup = sel.duplicate();
      dupMap[sel._id] = dup;
      newSelection.push(dup);
    });

    // make a copy of all connectors between selected nodes
    let processedOutputs = {};
    const processedConnectors = [];
    selection.forEach((sel) => {
      if (!(sel instanceof XibleEditorNode)) {
        return;
      }

      sel.getOutputs()
      .forEach((output) => {
        if (processedOutputs[output._id]) {
          return;
        }
        processedOutputs[output._id] = true;

        output.connectors.forEach((conn) => {
          if (dupMap[conn.destination.node._id]) {
            processedConnectors.push(`${conn.origin._id},${conn.destination._id}`);

            const dupConn = new XibleEditorConnector({
              origin: dupMap[sel._id].getOutputByName(output.name),
              destination: dupMap[conn.destination.node._id].getInputByName(conn.destination.name)
            });
            newSelection.push(dupConn);
          }
        });
      });
    });
    processedOutputs = null;

    // make a copy of all connectors with only one side connected in the selection
    selection.forEach((conn) => {
      if (!(conn instanceof XibleEditorConnector)) {
        return;
      }

      if (processedConnectors.indexOf(`${conn.origin._id},${conn.destination._id}`) > -1) {
        return;
      }

      const origNode = dupMap[conn.origin.node._id];
      const destNode = dupMap[conn.destination.node._id];
      if (!origNode || !destNode) {
        const dupConn = new XibleEditorConnector({
          origin: origNode ? origNode.getOutputByName(conn.origin.name) : conn.origin,
          destination: destNode ? destNode.getInputByName(conn.destination.name) : conn.destination
        });
        newSelection.push(dupConn);
      }
    });

    return newSelection;
  }

  disableZoom() {
    this.element.removeEventListener('wheel', this._zoomWheelListener);
  }

  /**
  * Enables zooming using the scrollwheel in the editor.
  */
  enableZoom() {
    this.zoom = 1;

    // trigger zoom from scrollwheel
    this.element.addEventListener('wheel', this._zoomWheelListener = (event) => {
      // prevent default browser action; scroll
      event.preventDefault();

      // find the current cursor position,
      // relative against the actions, but no transform (translate/zoom) applied
      const mouseLeft = event.pageX - this.getOffsetPosition().left;
      const mouseTop = event.pageY - this.getOffsetPosition().top;

      // find the current cursor position,
      // relative against the actions, but now with transform (translate/zoom) applied
      const relativeMouseLeft = (mouseLeft - this.left) / this.zoom;
      const relativeMouseTop = (mouseTop - this.top) / this.zoom;

      // in or out
      if (event.deltaY > 0 && this.zoom >= 0.2) {
        this.zoom = (Math.round(this.zoom * 10) - 1) / 10;
      } else if (event.deltaY < 0 && this.zoom < 5) {
        this.zoom = (Math.round(this.zoom * 10) + 1) / 10;
      }

      // update left/top based on cursor position
      this.left = relativeMouseLeft - (this.zoom * relativeMouseLeft) + mouseLeft - relativeMouseLeft;
      this.top = relativeMouseTop - (this.zoom * relativeMouseTop) + mouseTop - relativeMouseTop;

      // apply the zoom transformation
      this.transform();
    });
  }

  disablePan() {
    this.element.removeEventListener('mousedown', this._panMouseDownListener);
    document.body.removeEventListener('mouseup', this._panMouseUpListener);
  }

  /**
  * Enables panning by holding down the scrollwheel.
  */
  enablePan() {
    this.top = 0;
    this.left = 0;
    this.backgroundLeft = 0;
    this.backgroundTop = 0;

    let mousePanFunction;
    this.element.addEventListener('mousedown', this._panMouseDownListener = (event) => {
      if (
        mousePanFunction ||
        (event.button === 0 && !event.shiftKey) ||
        event.button > 1
      ) {
        return;
      }

      // initial values based on current position
      const initPageX = event.pageX;
      const initPageY = event.pageY;
      const initLeft = this.left;
      const initTop = this.top;
      const initBackgroundLeft = this.backgroundLeft;
      const initBackgroundTop = this.backgroundTop;

      this.element.classList.add('panning');

      // catch the mousemove event
      document.body.addEventListener('mousemove', mousePanFunction = (mouseMoveEvent) => {
        // check how much we moved since the initial mousedown event
        const relativePageX = mouseMoveEvent.pageX - initPageX;
        const relativePageY = mouseMoveEvent.pageY - initPageY;

        // save the new position
        this.left = initLeft + relativePageX;
        this.top = initTop + relativePageY;

        // apply pan to background position as well
        this.backgroundLeft = initBackgroundLeft + (mouseMoveEvent.pageX - initPageX);
        this.backgroundTop = initBackgroundTop + (mouseMoveEvent.pageY - initPageY);

        this.transform();
      });

      event.preventDefault();
    });


    // unhook eventhandler created on mousedown
    document.body.addEventListener('mouseup', this._panMouseUpListener = () => {
      if (!mousePanFunction) {
        return;
      }

      document.body.removeEventListener('mousemove', mousePanFunction);
      mousePanFunction = null;

      this.element.classList.remove('panning');
    });
  }

  disableHook() {
    document.body.removeEventListener('mouseup', this._hookMouseUpListener);
  }

  // enable hooking of connectors
  enableHook() {
    // triggered when shuffling completes
    document.body.addEventListener('mouseup', this._hookMouseUpListener = () => {
      if (!this.dummyXibleConnectors || !this.dummyXibleNode) {
        return;
      }

      // destroy the temporary connector & dummyXibleNode
      this.dummyXibleNode.delete();
      this.dummyXibleConnectors.forEach(conn => conn.delete());
      this.dummyXibleConnectors = null;
      this.dummyXibleNode = null;
      this.dummyIo = null;

      // ensure we deselect the dummyXibleNode
      this.deselect();
    });
  }

  destroy() {
    this.disableSelection();
    this.disableHook();
    this.disablePan();
    this.disableZoom();
    this.disableNodeSelector();

    this.xibleWrapper.removeListener('close', this._xibleWrapperCloseListener);
    this.xibleWrapper.removeListener('message', this._xibleWrapperMessageListener);

    this.loadedFlow = null;
  }

  static get inputElementNameList() {
    return ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA'];
  }

  static isInputElement(el) {
    if (!el) {
      return true;
    }

    return el.classList.contains('content') || this.inputElementNameList.indexOf(el.nodeName) > -1;
  }
}
