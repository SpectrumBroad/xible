'use strict';

class XibleEditorNode extends xibleWrapper.Node {
  constructor(obj, ignoreData) {
    const el = document.createElement('div');
    el.classList.add('node');

    const headerEl = el.appendChild(document.createElement('h1'));

    // add ios
    const ios = el.appendChild(document.createElement('div'));
    ios.classList.add('io');

    // add input list
    const inputList = ios.appendChild(document.createElement('ul'));
    inputList.classList.add('input');

    // add output list
    const outputList = ios.appendChild(document.createElement('ul'));
    outputList.classList.add('output');

    super(Object.assign({}, obj, {
      element: el,
      inputList,
      outputList
    }), ignoreData);

    headerEl.appendChild(document.createTextNode(this.name));

    // add additional content
    if (this.hostsEditorContent) { // load editor static hosted content for this node
      this.getAndProcessEditorContent();
    } else if (!this.nodeExists && obj.editorContent) {
      this.processEditorContent(obj.editorContent);
    }

    this.statusTimeouts = {};
    this.statusEl = null;

    // selection handlers
    this.element.addEventListener('mousedown', (event) => {
      if (this.editor) {
        this.editor.toggleSelectionOnMouseEvent(event, this);
      }
    });
    this.element.addEventListener('mouseup', (event) => {
      if (this.editor) {
        this.editor.toggleSelectionOnMouseEvent(event, this);
      }
    });

    // direct handler
    headerEl.addEventListener('dblclick', () => {
      if (!this.editor || this.type !== 'action' || !this.editor.browserSupport) {
        return;
      }

      // check if direct mode is alowed before continuing
      xibleWrapper.Config
      .getValue('editor.flows.allowdirect')
      .then((allowDirect) => {
        if (!allowDirect) {
          return;
        }

        this.flow.undirect();

        // fetch all related connectors and nodes for the double clicked node
        const related = XibleEditorNode.getAllInputObjectNodes(this);

        // don't forget about globals
        related.nodes = related.nodes.concat(this.flow.getGlobalNodes());

        related.nodes.forEach((node) => {
          node._directSetDataListener = () => this.editor.loadedFlow.direct(related.nodes);
          node.on('setdata', node._directSetDataListener);
        });

        this.editor.loadedFlow.nodes
        .filter(node => related.nodes.indexOf(node) === -1)
        .forEach((node) => {
          node.element.classList.add('nodirect');
        });

        this.editor.loadedFlow.connectors
        .filter(connector => related.connectors.indexOf(connector) === -1)
        .forEach((connector) => {
          connector.element.classList.add('nodirect');
        });

        this.editor.loadedFlow.direct(related.nodes);
      });
    });

    if (!obj.nodeExists) {
      this.element.classList.add('fail');
      this.addStatus({
        _id: 1,
        color: 'red',
        message: 'This node does not exist in this configuration'
      });
    }
  }

  initInputs(inputs) {
    this.inputs = {};
    if (inputs) {
      for (const name in inputs) {
        this.addInput(new XibleEditorNodeInput(name, inputs[name]));
      }
    }
  }

  initOutputs(outputs) {
    this.outputs = {};
    if (outputs) {
      for (const name in outputs) {
        this.addOutput(new XibleEditorNodeOutput(name, outputs[name]));
      }
    }
  }

  getAndProcessEditorContent() {
    const proc = () => {
      this.getEditorContent().then((data) => {
        this.processEditorContent(data);
      });
    };

    if (this.editor) {
      proc();
    } else {
      this.once('beforeAppend', proc);
    }
  }

  processEditorContent(content) {
    this.editorContent = content;

    const proc = () => {
      const div = document.createElement('div');
      div.classList.add('content');

      // if attachShadow shadow DOM v1) is not supported, simply don't show contents
      if (typeof div.attachShadow !== 'function') {
        return;
      }

      // create the shadow and set the contents including the nodeContent.css
      const shadow = div.attachShadow({
        mode: 'open'
      });
      shadow.innerHTML = `<style>@import url("css/nodeContent.css");</style>${this.editorContent}`;

      // check if style element has loaded
      let stylesLoaded = false;
      let scriptsLoaded = false;
      let emittedLoad = false;

      // emit a load event
      const checkForEmitLoad = () => {
        if (!emittedLoad && stylesLoaded && scriptsLoaded) {
          this.emit('editorContentLoad');
          emittedLoad = true;
        }
      };

      // hook an eventlistener to check if the style element has loaded
      const styleEl = shadow.querySelector('style');
      styleEl.onload = () => {
        stylesLoaded = true;
        checkForEmitLoad();
      };

      // append the div & shadowroot to the node
      this.element.appendChild(div);
      this.editorContentEl = shadow;

      // trigger some convenience stuff
      this.convenienceLabel();
      this.convenienceHideIfAttached();
      this.convenienceOutputValue();

      // run script elements
      Array.from(shadow.querySelectorAll('script'))
      .forEach((scriptEl) => {
        new Function('window', 'document', scriptEl.textContent).call(this, null, shadow); // eslint-disable-line no-new-func
      });

      scriptsLoaded = true;
      checkForEmitLoad();
    };

    if (this.editor) {
      proc();
    } else {
      this.once('beforeAppend', proc);
    }
  }

  setPosition(left = 0, top = 0) {
    super.setPosition(left, top);
    this.element.style.transform = `translate(${this.left}px, ${this.top}px)`;
  }

  duplicate(ignoreData) {
    const duplicateXibleNode = new XibleEditorNode(this, ignoreData);
    duplicateXibleNode.flow = null;
    duplicateXibleNode.editor = null;

    // create a unique id for the node
    duplicateXibleNode._id = xibleWrapper.generateObjectId();

    // create a unique id for the inputs
    for (const name in duplicateXibleNode.inputs) {
      duplicateXibleNode.inputs[name]._id = xibleWrapper.generateObjectId();
    }

    // create a unique id for the outputs
    for (const name in duplicateXibleNode.outputs) {
      duplicateXibleNode.outputs[name]._id = xibleWrapper.generateObjectId();
    }

    return duplicateXibleNode;
  }

  addInput(input) {
    super.addInput(input);
    this.inputList.appendChild(input.element);

    return input;
  }

  addOutput(output) {
    super.addOutput(output);
    this.outputList.appendChild(output.element);

    return output;
  }

  deleteInput(input) {
    super.deleteInput(input);
    this.inputList.removeChild(input.element);
    return input;
  }

  deleteOuput(output) {
    super.deleteOuput(output);
    this.outputList.removeChild(output.element);
    return output;
  }

  delete() {
    if (this.editor) {
      this.editor.deleteNode(this);
    }

    super.delete();
  }

  addProgressBar(status) {
    if (!status || !status._id) {
      return;
    }

    let ul = this.statusEl;
    if (!ul) {
      ul = this.statusEl = this.element.appendChild(document.createElement('ul'));
      ul.classList.add('statuses');
    }

    const li = ul.appendChild(document.createElement('li'));
    li.setAttribute('data-statusid', status._id);
    li.classList.add('bar');

    if (status.message) {
      li.appendChild(document.createTextNode(status.message));
    }

    const statusBarHolder = li.appendChild(document.createElement('div'));
    statusBarHolder.classList.add('holder');
    statusBarHolder.appendChild(document.createElement('div'));

    if (status.timeout) {
      // check when this progressbar should start (future)
      // or when it started (past)
      const startDiff = Date.now() - status.startDate + this.editor.serverClientDateDifference;

      this.statusTimeouts[status._id] = window.setTimeout(() => {
        this.removeStatusById(status._id);
      }, status.timeout - startDiff);
    }

    this.updateProgressBarById(status._id, status);
  }

  updateProgressBarById(statusId, status) {
    if (!this.statusEl || !statusId || !status || typeof status.percentage !== 'number') {
      return;
    }

    const li = this.statusEl.querySelector(`li.bar[data-statusid="${statusId}"]`);
    if (li) {
      const bar = li.querySelector('.holder>div');
      bar.style.transition = 'none';
      bar.style.width = `${status.percentage}%`;

      if (status.updateOverTime) {
        // check when this progressbar should start (future)
        // or when it started (past)
        let startDiff = Date.now() - status.startDate + this.editor.serverClientDateDifference;

        // max it out
        if (startDiff > status.updateOverTime) {
          startDiff = status.updateOverTime;
        }

        // if this progressbar should have started in the past
        // calculate where the width should be right now
        if (startDiff > 0) {
          bar.style.width = `${startDiff / status.updateOverTime * 100}%`;
        }

        bar.offsetWidth; // eslint-disable-line
        bar.style.transition = `width ${status.updateOverTime - (startDiff > 0 ? startDiff : 0)}ms ${startDiff < 0 ? Math.abs(startDiff) : 0}ms linear`;
        bar.style.width = '100%';
      }
    }
  }

  addStatus(status) {
    if (!status || !status._id) {
      return;
    }

    xibleWrapper.Config
    .getValue('editor.nodes.statuses.max')
    .then((configMaxStatuses) => {
      let statusCount = 0;
      let ul = this.statusEl;
      if (!ul) {
        ul = this.statusEl = this.element.appendChild(document.createElement('ul'));
        ul.classList.add('statuses');
      } else {
        statusCount = ul.querySelectorAll('li:not(.bar)').length;
      }

      // remove all statuses above the max config setting
      if (typeof configMaxStatuses === 'number' && statusCount >= configMaxStatuses && ul.firstChild) {
        while (statusCount >= configMaxStatuses && ul.firstChild) {
          const removeChild = ul.firstChild;
          this.removeStatusById(removeChild.getAttribute('data-statusid'));
          statusCount -= 1;
        }
      }

      if (configMaxStatuses === 0) {
        return;
      }

      const li = ul.appendChild(document.createElement('li'));
      li.setAttribute('data-statusid', status._id);

      if (status.color) {
        li.classList.add(status.color);
      }

      if (typeof status.message === 'string') {
        let messageLineSplit = status.message.split('\n');
        for (let i = 0; i < messageLineSplit.length; i += 1) {
          if (i) {
            li.appendChild(document.createElement('br'));
          }
          li.appendChild(document.createTextNode(messageLineSplit[i]));
        }
        messageLineSplit = null;
      }

      if (status.timeout) {
        this.statusTimeouts[status._id] = window.setTimeout(() => {
          this.removeStatusById(status._id);
        }, status.timeout);
      }
    });
  }

  updateStatusById(statusId, status) {
    if (!this.statusEl) {
      return;
    }

    const li = this.statusEl.querySelector(`li[data-statusid="${statusId}"]`);
    if (li) {
      if (status.message) {
        if (li.lastChild) {
          li.removeChild(li.lastChild);
        }

        li.appendChild(document.createTextNode(status.message));
      }
    }
  }

  removeStatusById(statusId, timeout) {
    // clear timeout
    if (this.statusTimeouts[statusId]) {
      window.clearTimeout(this.statusTimeouts[statusId]);
      this.statusTimeouts[statusId] = null;
      delete this.statusTimeouts[statusId];
    }

    // get and delete li
    if (this.statusEl) {
      const li = this.statusEl.querySelector(`li[data-statusid="${statusId}"]`);
      if (li) {
        const fn = () => {
          if (this.statusEl) {
            this.statusEl.removeChild(li);
          }
        };

        if (timeout) {
          window.setTimeout(fn, timeout);
        } else {
          fn();
        }
      }
    }
  }

  removeAllStatuses() {
    // clear all timeouts
    let statusId;
    for (statusId in this.statusTimeouts) {
      window.clearTimeout(this.statusTimeouts[statusId]);
      this.statusTimeouts[statusId] = null;
      delete this.statusTimeouts[statusId];
    }

    // destroy the el
    if (this.statusEl) {
      if (this.statusEl.parentNode) {
        this.statusEl.parentNode.removeChild(this.statusEl);
      }
      this.statusEl = null;
    }
  }

  setTracker(status) {
    if (this.removeTrackerTimeout) {
      window.clearTimeout(this.removeTrackerTimeout);
      this.removeTrackerTimeout = null;
    }

    if (this.trackerEl) {
      if (this.trackerEl.parentNode) {
        this.trackerEl.parentNode.removeChild(this.trackerEl);
      }
      this.trackerEl = null;
    }

    if (status) {
      const div = this.trackerEl = document.createElement('div');
      div.classList.add('tracker');

      if (status.color) {
        div.classList.add(status.color);
      }

      if (status.message) {
        this.element.appendChild(div).appendChild(document.createTextNode(status.message));
      }

      if (status.timeout) {
        this.removeTrackerTimeout = window.setTimeout(() => {
          this.setTracker();
        }, status.timeout);
      }
    }
  }

  getRootLabelElements() {
    return Array.from(this.editorContentEl.querySelectorAll(':host>label'));
  }

  getRootInputElements() {
    return Array.from(this.editorContentEl.querySelectorAll(':host>input, :host>selectcontainer'));
  }

  /**
  * Creates a label for every input/selectcontainer element that doesn't have one.
  */
  convenienceLabel() {
    this.getRootInputElements()
    .forEach((el) => {
      const label = document.createElement('label');
      this.editorContentEl.replaceChild(label, el);
      label.appendChild(el);

      // set the required attribute
      // because the :has() pseudo selector is not available (yet)
      if (
        el.required ||
        (el.nodeName === 'SELECTCONTAINER' && el.querySelector('select') && el.querySelector('select').required)
      ) {
        label.classList.add('required');
      } else {
        label.classList.add('optional');
      }

      // copy the description to the label
      const description = el.getAttribute('data-description');
      if (description) {
        label.setAttribute('data-description', description);
      }

      // add the label
      let placeholder = el.getAttribute('placeholder') || el.getAttribute('data-outputvalue');
      const span = document.createElement('span');

      // try to fetch a placeholder for a select input
      if (!placeholder && el.nodeName === 'SELECTCONTAINER') {
        const selectEl = el.querySelector('select');
        if (selectEl) {
          placeholder = selectEl.getAttribute('placeholder') || selectEl.getAttribute('data-outputvalue');
        }
      }

      if (!placeholder) {
        span.classList.add('unknown');
      }

      span.appendChild(document.createTextNode(placeholder || 'unknown'));
      label.appendChild(span);

      // ensure hideif attached is hooked properly
      const hideIfAttached = el.getAttribute('data-hideifattached');
      if (hideIfAttached) {
        label.setAttribute('data-hideifattached', hideIfAttached);
      }
    });
  }

  convenienceOutputValue() {
    const els = Array.from(this.editorContentEl.querySelectorAll('[data-outputvalue]'));
    els.forEach((el) => {
      const attr = el.getAttribute('data-outputvalue');
      const type = el.getAttribute('type');

      // set the default value
      if (this.data[attr]) {
        if (type === 'checkbox' && el.getAttribute('value') === this.data[attr]) {
          el.checked = true;
        } else if (el.nodeName === 'SELECT') {
          Array.from(el.querySelectorAll('option')).forEach((option) => {
            if ((option.getAttribute('value') || option.textContent) === this.data[attr]) {
              option.selected = true;
            } else {
              option.selected = false;
            }
          });
        } else {
          el.setAttribute('value', this.data[attr]);
        }
      } else if (typeof this.data[attr] === 'undefined') {
        if (type === 'checkbox') {
          el.checked = false;
        } else {
          this.data[attr] = el.value;
        }
      }

      switch (type) {
        // hidden inputs don't trigger 'onchange' or 'oninput'
        case 'hidden': {
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.attributeName === 'value') {
                this.setData(attr, el.value);
              }
            });
          });

          observer.observe(el, {
            attributes: true,
            childList: false,
            characterData: false
          });
          break;
        }

        // checkbox and radio both don't trigger input event
        case 'checkbox':
        case 'radio':
          el.addEventListener('change', () => {
            if (el.checked) {
              this.setData(attr, el.value);
            } else {
              this.setData(attr, null);
            }
          });
          break;

        default:
          el.addEventListener('input', () => {
            this.setData(attr, el.value);
          });
          break;
      }
    });
  }

  convenienceHideIfAttached() {
    const els = Array.from(this.editorContentEl.querySelectorAll('[data-hideifattached]'));
    els.forEach((el) => {
      const attr = el.getAttribute('data-hideifattached');
      let matchArray;
      const ioArray = [];

      const re = /(input|output)\s*\[\s*name\s*=\s*"?(\w*)"?\s*\]/g;
      while ((matchArray = re.exec(attr))) { // eslint-disable-line no-cond-assign
        const io = this[`${matchArray[1]}s`][matchArray[2]];
        if (io) {
          ioArray.push(io);

          if (io.connectors.length) {
            el.style.display = 'none';
          }

          io.on('attach', () => {
            el.style.display = 'none';
          });

          io.on('detach', () => {
            if (ioArray.every(io => !io.connectors.length)) {
              el.style.display = '';
            }
          });
        }
      }
    });
  }
}

const XibleEditorNodeIo = toExtend => class extends toExtend {
  constructor(name, obj) {
    const el = document.createElement('li');
    el.appendChild(document.createElement('div'));

    super(name, Object.assign({}, obj, {
      element: el
    }));

    // double click for global
    this.element.addEventListener('dblclick', () => {
      const globalValue = !this.global;
      if (
        this instanceof XibleEditorNodeInput &&
        !this.node.flow.getGlobalOutputs()
        .find(gOutput => gOutput.type === this.type)
      ) {
        return;
      }

      this.setGlobal(globalValue);
    });

    // enable mousedown -> mousemove handler for creating new connections
    this.enableHook();
  }

  setSingleType(bool) {
    super.setSingleType(bool);

    // TODO: unhook eventlisteners when changing singleType

    if (this.singleType) {
      this.on('attach', (conn) => {
        const connLoc = conn[this instanceof XibleEditorNodeInput ? 'origin' : 'destination'];
        if (connLoc && connLoc.type) {
          this.setType(connLoc.type);
        }
      });

      this.on('detach', () => {
        if (!this.connectors.length) {
          this.setType(null);
        }
      });
    }

    this.verifyConnectors();
  }

  setGlobal(global) {
    super.setGlobal(global);

    if (global) {
      this.element.classList.add('global');
    } else {
      this.element.classList.remove('global');
    }
  }

  setType(type) {
    // remove old type
    if (this.type) {
      this.element.classList.remove(this.type);
    }

    super.setType(type);

    // set new type
    if (type) {
      this.element.classList.add(type);
    }

    return this;
  }

  setName(name) {
    // remove old name
    if (this.element.firstChild.firstChild) {
      this.element.firstChild.removeChild(this.element.firstChild.firstChild);
    }

    super.setName(name);

    // set new name
    this.element.firstChild.appendChild(document.createTextNode(name));

    return this;
  }

  hide() {
    super.hide();
    this.element.style.display = 'none';
  }

  unhide() {
    super.unhide();
    this.element.style.display = '';
  }

  enableHook() {
    const el = this.element;

    // handle whenever someone inits a new connector on this action
    el.addEventListener('mousedown', (event) => {
      // we only take action from the first mousebutton
      if (event.button !== 0) {
        return;
      }

      // if there's nothing to move, return
      if (event.shiftKey && this.connectors.length === 0) {
        return;
      }

      event.stopPropagation();

      // only start a connector after we moved a little
      // this prevents picking up double click
      const initPageX = event.pageX;
      const initPageY = event.pageY;

      let mouseMoveListener;
      document.addEventListener('mousemove', mouseMoveListener = (event) => {
        // confirm that we moved
        const pageX = event.pageX;
        const pageY = event.pageY;
        if (Math.abs(pageX - initPageX) > 2 || Math.abs(pageY - initPageY) > 2) {
          document.removeEventListener('mousemove', mouseMoveListener);
          mouseMoveListener = null;

          // create a dummy action that acts as the input parent while moving
          this.node.editor.dummyXibleNode = new XibleEditorNode({
            name: 'dragdummy'
          });

          // hide the dummy
          this.node.editor.dummyXibleNode.element.style.visibility = 'hidden';
          this.node.editor.dummyXibleNode.element.style.zIndex = -1;

          let outGoing = this instanceof XibleEditorNodeOutput;
          outGoing = event.shiftKey ? !outGoing : outGoing;

          // create a dummyinput that acts as the connector endpoint
          if (outGoing) {
            this.node.editor.dummyIo = new XibleEditorNodeInput('dummy', {
              type: this.type
            });
            this.node.editor.dummyXibleNode.addInput(this.node.editor.dummyIo);
          } else {
            this.node.editor.dummyIo = new XibleEditorNodeOutput('dummy', {
              type: this.type
            });
            this.node.editor.dummyXibleNode.addOutput(this.node.editor.dummyIo);
          }

          // add the dummy to the editor
          this.node.editor.addNode(this.node.editor.dummyXibleNode);

          // get window offsets for viewport
          const actionsOffset = this.node.editor.getOffsetPosition();

          // set the initial position at the mouse position
          const left = ((event.pageX - actionsOffset.left - this.node.editor.left) / this.node.editor.zoom) -
            this.node.editor.dummyIo.element.offsetLeft - (outGoing ? 0 : this.node.editor.dummyIo.element.offsetWidth + 2);
          const top = ((event.pageY - actionsOffset.top - this.node.editor.top) / this.node.editor.zoom) -
            this.node.editor.dummyIo.element.offsetTop - (this.node.editor.dummyIo.element.offsetHeight / 2);

          this.node.editor.dummyXibleNode.setPosition(left, top);

          // append the connector
          if (event.shiftKey) {
            // find selected connectors
            const selectedConnectors = this.node.editor.selection
            .filter(sel => sel instanceof XibleEditorConnector && (sel.origin === this || sel.destination === this));
            this.node.editor.dummyXibleConnectors = selectedConnectors.length ?
              selectedConnectors : this.connectors.slice(0);

            if (outGoing) {
              this.node.editor.dummyXibleConnectors
              .forEach(conn => conn.setDestination(this.node.editor.dummyIo));
            } else {
              this.node.editor.dummyXibleConnectors
              .forEach(conn => conn.setOrigin(this.node.editor.dummyIo));
            }
          } else {
            this.node.editor.dummyXibleConnectors = [
              this.node.editor.addConnector(new XibleEditorConnector({
                origin: outGoing ? this : this.node.editor.dummyIo,
                destination: outGoing ? this.node.editor.dummyIo : this,
                type: this.type
              }))
            ];
          }

          // make the dummy action drag
          this.node.editor.deselect();
          this.node.editor.select(this.node.editor.dummyXibleNode);
          this.node.editor.initDrag(event);

          // keep track of these for snap ins
          this.node.editor.dummyXibleConnectors.originalOrigin =
            this.node.editor.dummyXibleConnectors[0].origin;
          this.node.editor.dummyXibleConnectors.originalDestination =
            this.node.editor.dummyXibleConnectors[0].destination;
        }
      });

      document.addEventListener('mouseup', () => {
        if (mouseMoveListener) {
          document.removeEventListener('mousemove', mouseMoveListener);
          mouseMoveListener = null;
        }
      }, {
        once: true
      });
    });

    // handle whenever someone drops a new connector on this nodeio
    el.addEventListener('mouseup', () => {
      const connectors = this.node.editor.dummyXibleConnectors;
      if (!connectors) {
        return;
      }

      const outGoing = this instanceof XibleEditorNodeOutput;
      const end = connectors[0][(outGoing ? 'origin' : 'destination')];
      if (
        end !== this.node.editor.dummyIo &&
        end !== this
      ) {
        return;
      }

      this.matchesConnectors(connectors)
      .then((matchesConnectors) => {
        if (!matchesConnectors) {
          return;
        }

        // create the new connectors
        connectors.forEach((conn) => {
          const newConn = new XibleEditorConnector({
            origin: outGoing ? this : conn.origin,
            destination: outGoing ? conn.destination : this
          });

          if (newConn.destination.global) {
            newConn.destination.setGlobal(undefined);
          }

          this.node.editor.loadedFlow.connectors.push(newConn);
          this.node.editor.addConnector(newConn);
        });

        // ensure we deselect
        this.node.editor.deselect();

        // destroy the temporary connector & dummyXibleNode
        this.node.editor.dummyXibleConnectors = null;
        this.node.editor.dummyIo = null;
        this.node.editor.dummyXibleNode.delete();
        this.node.editor.dummyXibleNode = null;
      });
    });

    // handle snap-to whenever a new connector is hovered over this io
    el.addEventListener('mouseover', () => {
      const connectors = this.node.editor.dummyXibleConnectors;
      if (!connectors) {
        return;
      }

      // we don't allow snap-in if the selected connectors are of multiple types,
      // while the input/output only allows a single type to be connected
      if (this.singleType) {
        const multiType = this instanceof XibleEditorNodeInput ?
          connectors
          .some(conn => conn.origin.type !== connectors[0].origin.type) :
          connectors
          .some(conn => conn.destination.type !== connectors[0].destination.type);
        if (multiType) {
          return;
        }
      }

      const outGoing = this instanceof XibleEditorNodeOutput;
      const end = connectors[0][(outGoing ? 'origin' : 'destination')];
      if (
        end !== this.node.editor.dummyIo &&
        end !== this
      ) {
        return;
      }

      this.matchesConnectors(connectors)
      .then((matchesConnectors) => {
        if (!matchesConnectors) {
          return;
        }

        if (this instanceof XibleEditorNodeInput) {
          connectors.forEach(conn => conn.setDestination(this));
        } else {
          connectors.forEach(conn => conn.setOrigin(this));
        }
      });
    });

    // handle snap-out
    el.addEventListener('mouseout', () => {
      const connectors = this.node.editor.dummyXibleConnectors;
      if (
        this instanceof XibleEditorNodeInput && connectors &&
        connectors[0].destination === this &&
        connectors[0].destination !== connectors.originalDestination
      ) {
        connectors.forEach(conn => conn.setDestination(this.node.editor.dummyIo));
      } else if (
        this instanceof XibleEditorNodeOutput && connectors &&
        connectors[0].origin === this &&
        connectors[0].origin !== connectors.originalOrigin
      ) {
        connectors.forEach(conn => conn.setOrigin(this.node.editor.dummyIo));
      }
    });
  }
};

class XibleEditorNodeInput extends XibleEditorNodeIo(xibleWrapper.NodeInput) {
}

class XibleEditorNodeOutput extends XibleEditorNodeIo(xibleWrapper.NodeOutput) {
  setGlobal(global) {
    super.setGlobal(global);

    if (this.node && this.node.flow) {
      this.node.flow.emit('global', this);
    }
  }
}
