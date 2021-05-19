'use strict';

class XibleEditorNodeSelector {
  /**
  * Create a new nodeSelector.
  * @param {XibleEditor} XIBLE_EDITOR
  */
  constructor(XIBLE_EDITOR) {
    this.xibleEditor = XIBLE_EDITOR;

    // indicates if the selector was opened above or below the mouse position
    // and left or right
    this.openTop = false;
    this.openLeft = false;

    // x & y position the selector was opened
    this.openYPosition = 0;
    this.openXPosition = 0;

    this.nodes = {}; // map containing the nodes from xible.
    this.registryNodePacks = {}; // map containing the nodepacks from the registry.

    // detail div for downloading new nodes
    const detailDiv = document.body.appendChild(document.createElement('div'));
    this.detailDiv = detailDiv;
    detailDiv.setAttribute('id', 'detailNodeSelector');
    detailDiv.classList.add('hidden');
    detailDiv.innerHTML = `
      <div id="nodePackSub"></div>
      <button id="nodePackConfirmButton" type="button">Confirm</button>
      <button id="nodePackCancelButton" type="button" class="cancel">Cancel</button>
    `;

    this.detailDivSub = document.getElementById('nodePackSub');
    this.detailConfirmButton = document.getElementById('nodePackConfirmButton');
    document.getElementById('nodePackCancelButton').onclick = () => {
      this.close();
    };

    // the div containing the node list
    const div = document.body.appendChild(document.createElement('div'));
    this.div = div;
    div.setAttribute('id', 'nodeSelector');

    // this list will be populated with the local installed nodes
    const nodesUl = document.createElement('ul');
    this.nodesUl = nodesUl;

    const filterInput = div.appendChild(document.createElement('input'));
    this.filterInput = filterInput;
    filterInput.setAttribute('type', 'text');
    filterInput.setAttribute('placeholder', 'filter nodes');
    filterInput.addEventListener('input', () => {
      // always hide the detail div when typing
      // this prevents the div to be left hanging at an incosistent position
      // relative to the main div
      this.detailDiv.classList.add('hidden');

      this.setListsVisibility();

      this.position();
    });

    // handle key navigation
    div.addEventListener('keydown', (event) => {
      if (
        event.code !== 'Space'
        && event.code !== 'ArrowUp'
        && event.code !== 'ArrowDown'
      ) {
        return;
      }

      const selectedNode = this.nodesUl.querySelector('li.selected:not(.hidden)');
      if (selectedNode) {
        event.stopPropagation();
        event.preventDefault();
      }

      if (event.code === 'Space') {
        if (selectedNode) {
          const nodeName = selectedNode.querySelector('h1').getAttribute('title');
          const nodePackName = selectedNode.querySelector('h1').getAttribute('data-nodePackName');
          if (this.nodes[nodeName]) {
            this.addNodeOnEvent(
              this.nodes[nodeName], event, this.openXPosition, this.openYPosition
            );

            event.stopPropagation();

            this.close();
          } else if (this.registryNodePacks[nodePackName]) {
            this.detailedNodeView(selectedNode, this.registryNodePacks[nodePackName], nodeName);
          }
        }
      }

      if (event.code === 'ArrowUp') {
        let newNodeSelection;
        if (selectedNode) {
          selectedNode.classList.remove('selected');
          newNodeSelection = selectedNode.previousSibling;
          while (newNodeSelection && newNodeSelection.classList.contains('hidden')) {
            newNodeSelection = newNodeSelection.previousSibling;
          }
        }

        if (newNodeSelection) {
          newNodeSelection.classList.add('selected');
          newNodeSelection.scrollIntoView();
        }
      }

      if (event.code === 'ArrowDown') {
        let newNodeSelection;
        if (!selectedNode) {
          newNodeSelection = this.nodesUl.querySelector('li:not(.hidden)');
        } else {
          selectedNode.classList.remove('selected');
          newNodeSelection = selectedNode.nextSibling;
          while (newNodeSelection && newNodeSelection.classList.contains('hidden')) {
            newNodeSelection = newNodeSelection.nextSibling;
          }
        }

        if (newNodeSelection) {
          newNodeSelection.classList.add('selected');
          newNodeSelection.scrollIntoView();
        }
      }
    })

    div.appendChild(nodesUl);

    // create a search online button
    const searchOnlineButton = div.appendChild(document.createElement('button'));
    this.searchOnlineButton = searchOnlineButton;
    searchOnlineButton.setAttribute('type', 'button');
    searchOnlineButton.appendChild(document.createTextNode('search online'));
    searchOnlineButton.setAttribute('title', 'Search xible.io for nodes matching your filter');
    searchOnlineButton.addEventListener('click', async () => {
      if (!filterInput.value) {
        return;
      }

      const filterInputValue = filterInput.value.toLowerCase();

      this.detailDiv.classList.add('hidden');
      searchOnlineButton.classList.add('loading');

      // query the registry
      try {
        const nodePacks = await this.xibleEditor.xibleWrapper.Registry
          .searchNodePacks(filterInputValue);
        this.registryNodePacks = nodePacks;

        // print the li's belonging to the found nodePacks
        for (const nodePackName in nodePacks) {
          const nodePack = nodePacks[nodePackName];
          for (let i = 0; i < nodePack.nodes.length; i += 1) {
          // check if this nodeName doesn't already exist in the list
            const nodeName = nodePack.nodes[i].name;
            if (nodesUl.querySelector(`li h1[title="${nodeName}"]`)) {
              continue;
            }

            // construct the new node and append to the list
            const li = XibleEditorNodeSelector.buildNode(nodeName, nodePack.nodes[i], nodePackName);
            li.classList.add('online');
            li.onclick = () => {
            // open the detailed confirmation view
              this.detailedNodeView(li, nodePack, nodeName);
            };
            nodesUl.appendChild(li);
          }
        }

        this.setListsVisibility('online');

        this.position();

        searchOnlineButton.addEventListener('animationiteration', () => {
          searchOnlineButton.classList.remove('loading');
        }, {
          once: true
        });
      } catch (searchRegistryErr) {
        div.classList.add('noresults');

        searchOnlineButton.addEventListener('animationiteration', () => {
          searchOnlineButton.classList.remove('loading');
        }, {
          once: true
        });
      }
    });

    // open the node menu on double click
    this._openOnMouseEvent = (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (
        !event.ctrlKey && !event.shiftKey
        && XIBLE_EDITOR.loadedFlow && XIBLE_EDITOR.browserSupport
        && (
          event.target === XIBLE_EDITOR.element
          || event.target === XIBLE_EDITOR.editorElement
          || event.target === XIBLE_EDITOR.editorWrapperElement
        )
      ) {
        this.open(event);
      }
    };
    this.xibleEditor.element.addEventListener('contextmenu', this._openOnMouseEvent);
    this.xibleEditor.element.addEventListener('dblclick', this._openOnMouseEvent);

    // hide the nodeSelector element if selection moves elsewhere
    document.body.addEventListener('mousedown', this._mouseDownEventHandler = (event) => {
      if (!div.classList.contains('hidden') && !div.contains(event.target) && !detailDiv.contains(event.target)) {
        this.close();
      }
    });

    // check what the default hide of the node selector is
    const clientRect = this.div.getBoundingClientRect();
    this.baseHeight = clientRect.height;
    this.baseWidth = clientRect.width;

    // hide the div
    div.classList.add('hidden');
  }

  /**
   * Destroy this instance of the node selector.
   */
  destroy() {
    if (this.detailDiv && this.detailDiv.parentNode) {
      document.body.removeChild(this.detailDiv);
      this.detailDiv = null;
    }

    if (this.div && this.div.parentNode) {
      document.body.removeChild(this.div);
      this.div = null;
    }

    this.xibleEditor.element.removeEventListener('contextmenu', this._openOnMouseEvent);
    this.xibleEditor.element.removeEventListener('dblclick', this._openOnMouseEvent);

    document.body.removeEventListener('mousedown', this._mouseDownEventHandler);
  }

  /**
  * Returns a list of search words from the filterInput
  * @returns {String[]}
  */
  getSearchWords() {
    return this.filterInput.value.toLowerCase()
      .replace(/[\W_]+/g, ' ')
      .split(' ');
  }

  /**
  * Removes the max message,
  * indicating that MAX_VISIBLE_ITEMS has been reached.
  * @returns {Boolean} Whether or not there was a max messages to remove.
  */
  removeMaxMessage() {
    const maxLi = this.nodesUl.querySelector('.max');
    if (maxLi) {
      this.nodesUl.removeChild(maxLi);
      return true;
    }
    return false;
  }

  /**
  * Adds the max message,
  * indicating that MAX_VISIBLE_ITEMS has been reached.
  * @returns {Boolean} Whether or not the max message was added.
  * Returns false if already exists.
  */
  addMaxMessage() {
    if (this.nodesUl.querySelector('.max')) {
      return false;
    }
    const newMaxLi = this.nodesUl.appendChild(document.createElement('li'));
    newMaxLi.classList.add('max');
    newMaxLi.appendChild(document.createTextNode(`The specified filter returns more than the allowed maximum of ${XibleEditorNodeSelector.MAX_VISIBLE_ITEMS} results.`));

    return true;
  }

  /**
  * Runs setVisibility() on each item in the list.
  * @param {String} className List of css class names
  * that should be on the list element before making visible.
  * @returns {Boolean} Whether there are any visible results or not.
  */
  setListsVisibility(className) {
    const filterInputValue = this.filterInput.value.toLowerCase();
    const searchWords = this.getSearchWords();

    this.removeMaxMessage();

    // filter the results
    const max = XibleEditorNodeSelector.MAX_VISIBLE_ITEMS;
    let visible = 0;
    let i;

    const lis = Array.from(this.nodesUl.querySelectorAll('li'));
    for (i = 0; i < lis.length; i += 1) {
      if (visible >= max) {
        if (visible === max) {
          this.addMaxMessage();
        }
        lis[i].classList.add('hidden');
        visible += 1;
      } else if (!filterInputValue) {
        lis[i].classList.remove('hidden');
        visible += 1;
      } else if (className && !lis[i].classList.contains(className)) {
        lis[i].classList.add('hidden');
      } else if (XibleEditorNodeSelector.setListVisibility(lis[i], filterInputValue, searchWords)) {
        visible += 1;
      }
    }

    if (!filterInputValue || visible) {
      this.div.classList.remove('noresults');
    } else {
      this.div.classList.add('noresults');
    }

    return visible > 0;
  }

  /**
  * Changes the visibility on a node in the list, based on the search conditions.
  * @param {HTMLElement} li
  * @param {String} filterInputValue The search value.
  * @param {String[]} searchWords Search keywords.
  * @returns {Boolean} Visible or not.
  */
  static setListVisibility(li, filterInputValue, searchWords) {
    const textContent = li.textContent.toLowerCase().replace(/-+/g, '');

    li.classList.remove('headerMatchExact', 'headerMatchPartial');
    if (
      !filterInputValue
      || searchWords.every((searchWord) => textContent.indexOf(searchWord) > -1)
    ) {
      // specify more relevant search results
      const headerTextContent = li.firstChild.textContent.toLowerCase();
      if (headerTextContent === filterInputValue) {
        li.classList.add('headerMatchExact');
      } else if (searchWords.every((searchWord) => headerTextContent.indexOf(searchWord) > -1)) {
        li.classList.add('headerMatchPartial');
      }

      li.classList.remove('hidden');
      return true;
    }

    li.classList.add('hidden');
    return false;
  }

  /**
  * Opens the detailed node view, for downloading/installing new nodes (/nodepacks).
  * @param {HTMLLIElement} li The list element from the main nodeSelector.
  * @param {xibleWrapper.NodePack} nodePack
  * @param {nodeName} nodeName Specific nodeName from the nodePack/li.
  */
  detailedNodeView(li, nodePack, nodeName) {
    // disable by default
    this.detailConfirmButton.disabled = true;

    // check if config allows installing new nodepacks
    this.xibleEditor.xibleWrapper.Config
      .getValue('registry.nodepacks.allowinstall')
      .then((allowInstall) => {
        this.detailConfirmButton.disabled = !allowInstall;

        if (!allowInstall) {
          document.getElementById('nodePackInstallDisabled').classList.remove('hidden');
        }
      });

    // set confirm button action
    this.detailConfirmButton.onclick = () => {
      this.detailConfirmButton.disabled = true;
      this.detailConfirmButton.classList.add('loading');
      li.classList.add('loading');

      this.xibleEditor.xibleWrapper.Registry
        .installNodePackByName(nodePack.name)
        .then(() => {
          this.detailConfirmButton.disabled = false;
          this.detailConfirmButton.classList.remove('loading');

          this.detailDiv.classList.add('hidden');

          // refill
          return this.fill();
        })
        .catch((err) => {
          this.detailConfirmButton.disabled = true;

          this.detailDivSub.innerHTML = '<p class="alert">An error occured.</p>';
          this.detailDivSub.appendChild(document.createElement('p')).appendChild(document.createTextNode(err));

          this.detailConfirmButton.addEventListener('animationiteration', () => {
            this.detailConfirmButton.classList.remove('loading');
            li.classList.remove('loading');
          }, {
            once: true
          });
        });
    };

    this.detailDiv.classList.remove('hidden');
    this.detailDiv.style.top = this.div.style.top;
    this.detailDiv.style.left = `${parseInt(this.div.style.left, 10) + this.div.offsetWidth - parseInt(getComputedStyle(this.detailDiv).borderLeftWidth, 10)}px`;

    // check if detailDiv overflows the chrome
    // if so, position detailDiv on the left side of div
    const clientRect = this.detailDiv.getBoundingClientRect();
    if (clientRect.left + clientRect.width > window.innerWidth) {
      this.detailDiv.style.left = `${parseInt(this.div.style.left, 10) - clientRect.width + parseInt(getComputedStyle(this.detailDiv).borderRightWidth, 10)}px`;
    }

    // also check top
    // align bottoms together if so
    if (clientRect.top + clientRect.height > window.innerHeight) {
      const divClientBottom = parseInt(this.div.style.top, 10) + this.div.offsetHeight;
      this.detailDiv.style.top = `${divClientBottom - clientRect.height}px`;
    }

    // fill data
    this.detailDivSub.innerHTML = `
      <p id="nodePackInstallDisabled" class="status alert hidden">Installing nodepacks is disabled <a href="/settings/registry#nodepacks" target="_blank">in settings</a>.</p>
      <section>
        <h1>${escapeHtml(nodeName)}</h1>
        <p>This node is part of nodepack "${escapeHtml(nodePack.name)}". By installing, all contents of this nodepack will be installed.</p>
      </section>
      <section>
        <h1>publish user</h1>
        <p>This node pack is published by user "${escapeHtml(nodePack.publishUserName)}"</p>
      </section>
      <section>
        <h1>nodes</h1>
        <ul>
          ${nodePack.nodes.map((node) => `<li>${escapeHtml(node.name)}</li>`).join('')}
        </ul>
      </section>
      <section>
        <h1>own risk</h1>
        <p>Installation and usage of these nodes is at your own risk.</p>
      </section>
    `;
  }

  /**
  * Builds a node for the nodeSelector.
  * @param {String} nodeName
  * @param {xibleWrapper.Node} node
  * @returns {HTMLLIElement} The created HTML element, an LI.
  */
  static buildNode(nodeName, node, nodePackName) {
    // list element containing the node heading and description
    const li = document.createElement('li');

    // the heading element containing the node name
    const h1 = li.appendChild(document.createElement('h1'));
    h1.setAttribute('title', nodeName);
    h1.setAttribute('data-nodePackName', nodePackName);
    h1.innerHTML = escapeHtml(nodeName).replace(/[._-]/g, (val) => `${val}<wbr />`);

    // scroll text if it overflows
    /*
    h1.appendChild(document.createTextNode(nodeName));

    li.addEventListener('mouseenter', () => {
      if (h1.scrollWidth > h1.offsetWidth) {
        h1.classList.add('overflow');
      }
    });

    li.addEventListener('mouseleave', () => {
      h1.classList.remove('overflow');
    });
    */

    // description
    const { description } = node;
    if (description) {
      li.appendChild(document.createElement('p')).appendChild(document.createTextNode(description));
    }

    return li;
  }

  /**
  * Hooks relevant listeners to a node in the selector.
  */
  hookNode(li, node) {
    // onmousedown so the user can drag the newly inserted node immediately
    li.addEventListener('mousedown', (event) => {
      if (event.button !== 0) {
        return;
      }

      this.addNodeOnEvent(node, event);

      event.stopPropagation();

      this.close();
    });
  }

  addNodeOnEvent(node, event, pageX, pageY) {
    const actionsOffset = this.xibleEditor.getOffsetPosition();
    const editorNode = this.xibleEditor.addNode(new XibleEditorNode(node));
    this.xibleEditor.loadedFlow.addNode(editorNode);
    const headerEl = editorNode.element.querySelector('h1');

    pageX = pageX || event.pageX;
    pageY = pageY || event.pageY;

    editorNode.setPosition(
      ((pageX - actionsOffset.left - this.xibleEditor.left) / this.xibleEditor.zoom)
      - (headerEl.offsetWidth / 2),
      ((pageY - actionsOffset.top - this.xibleEditor.top) / this.xibleEditor.zoom)
      - (headerEl.offsetHeight / 2)
    );

    this.xibleEditor.deselect();
    this.xibleEditor.select(editorNode);
    this.xibleEditor.initDrag(event);
  }

  /**
  * Fetches the nodes from xible and places them in the nodeSelector ul.
  * Keeps visible state correct if this functions is called multiple times.
  * @returns {Promise} Resolves when complete.
  */
  async fill() {
    // indicate that we're loading stuff
    this.div.classList.add('loading');
    this.reset();

    // reload the styles
    this.xibleEditor.loadTypeDefStyles();

    // track all nodeNames currently visible
    let visibleNodeNames;
    if (Array.from(this.nodesUl.querySelectorAll('li.hidden')).length) {
      visibleNodeNames = Array.from(this.nodesUl
        .querySelectorAll('li:not(.hidden) h1'))
        .map((header) => header.getAttribute('title'));
    }
    const hasMax = !!this.nodesUl.querySelector('.max');

    this.nodesUl.innerHTML = '';

    // get the installed nodes
    const nodes = await this.xibleEditor.xibleWrapper.http.request('GET', '/api/nodes')
      .toJson();
    this.nodes = nodes;

    // hide loader
    if (this.div.classList.contains('hidden')) {
      this.div.classList.remove('loading');
    } else {
      this.div.addEventListener('animationiteration', () => {
        this.div.classList.remove('loading');
      }, {
        once: true
      });
    }

    Object.keys(nodes)
      .forEach((nodeName) => {
        const li = XibleEditorNodeSelector.buildNode(nodeName, nodes[nodeName]);
        this.hookNode(li, nodes[nodeName]);

        if (visibleNodeNames) {
          li.classList.add('hidden');
        }

        this.nodesUl.appendChild(li);
      });

    // make items visible that were so before
    if (visibleNodeNames) {
      for (let i = 0; i < visibleNodeNames.length; i += 1) {
        const h1 = this.nodesUl.querySelector(`li h1[title="${visibleNodeNames[i]}"]`);
        if (h1) {
          h1.parentNode.classList.remove('hidden');
        }
      }
    }

    if (hasMax) {
      this.addMaxMessage();
    }
  }

  /**
  * Positions the nodeSelector according to some vars indicating where to open.
  */
  position() {
    const clientRect = this.div.getBoundingClientRect();
    if (this.openTop) {
      this.div.style.top = `${this.openYPosition - clientRect.height}px`;
    } else {
      this.div.style.top = `${this.openYPosition}px`;
    }

    if (this.openLeft) {
      this.div.style.left = `${this.openXPosition - clientRect.width}px`;
    } else {
      this.div.style.left = `${this.openXPosition}px`;
    }
  }

  /**
  * Opens the main node selector (not the detail one).
  * @param {MouseEvent} event Event which triggered the open. Used to set the correct position.
  */
  open(event) {
    // 0.38 is the vh defined on the nodeSelector CSS
    const divHeight = Math.floor((0.38 * window.innerHeight) + this.baseHeight);
    const divWidth = this.baseWidth;

    // track the positions where the selector was originally opened
    this.openXPosition = event.pageX;
    this.openYPosition = event.pageY;

    // position the nodeselector
    this.div.style.left = `${this.openXPosition}px`;
    this.div.style.top = `${this.openYPosition}px`;

    // ensure we are not overflowing the chrome
    this.openTop = false;
    this.openLeft = false;
    if (this.openYPosition + divHeight + 2 > window.innerHeight) {
      this.openTop = true;
    }
    if (this.openXPosition + divWidth + 2 > window.innerWidth) {
      this.openLeft = true;
    }

    this.setListsVisibility();

    this.div.classList.remove('hidden');

    // reposition
    if (this.openTop || this.openLeft) {
      this.position();
    }

    // focus!
    if (this.filterInput.value) {
      this.filterInput.select();
    }
    this.filterInput.focus();
  }

  /**
  * Closes all the node selectors,
  * both the main node list and the detail/download view.
  */
  close() {
    this.div.classList.add('hidden');
    this.reset();
  }

  /**
  * Resets the state of the nodeselector.
  */
  reset() {
    this.detailDiv.classList.add('hidden');

    this.detailConfirmButton.classList.remove('loading');
    this.searchOnlineButton.classList.remove('loading');
  }

  static get MAX_VISIBLE_ITEMS() {
    return 25;
  }
}
