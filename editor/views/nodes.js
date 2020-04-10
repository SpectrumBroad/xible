'use strict';

View.routes['/nodes'] = async (EL) => {
  EL.innerHTML = `
    <div id="sub">
      <header>XIBLE</header>
      <p id="connectionLost" class="status loading alert hidden">
        Connection lost
      </p>
      <section>
        <h1>Installed</h1>
        <ul>
          <li><a href="/test"></a></li>
        </ul>
      </section>
    </div>
    <div class="inner">
      <section>
        <h1>Nodepacks</h1>
        <p id="nodePacksNoneInstalledWarning" class="warning">
          There are no nodepacks installed.
        </p>
        <ul id="nodepacks" class="nodepacks">
        </ul>
      </section>
    </div>
  `;

  const nodePackUl = document.getElementById('nodepacks');
  const innerEl = EL.querySelector('.inner');
  const nodePacks = await xibleWrapper.NodePack.getAll();
  const nodePackNames = Object.keys(nodePacks);
  let loadedNodePackNameIndex = -1;

  const dummyEditor = {
    toggleSelectionOnMouseEvent: (event, obj) => {
      const selectedNodeElement = nodePackUl.parentNode.parentNode.querySelector('.selected');
      if (selectedNodeElement) {
        selectedNodeElement.classList.remove('selected');
      }

      obj.element.classList.add('selected');
    }
  };

  innerEl.addEventListener('scroll', () => {
    loadNextNodePack();
  });

  function loadNodePack(nodePackName) {
    // if (nodePacks[nodePackName].installedByDefault) {
    document.getElementById('nodePacksNoneInstalledWarning').classList.add('hidden');
    nodePackUl.appendChild(createNodePackEl(nodePacks[nodePackName]));
  }

  function loadNextNodePack() {
    if (
      loadedNodePackNameIndex >= nodePackNames.length - 1 ||
      innerEl.offsetHeight < (innerEl.scrollHeight - innerEl.scrollTop) - 300
    ) {
      return;
    }

    loadedNodePackNameIndex += 1;

    loadNodePack(nodePackNames[loadedNodePackNameIndex]);
    loadNextNodePack();
  }

  loadNextNodePack();

  function createNodePackEl(nodePack) {
    const li = document.createElement('li');

    const detailsUl = li.appendChild(document.createElement('ul'));
    detailsUl.classList.add('details');

    detailsUl.appendChild(document.createElement('li'))
    .appendChild(document.createTextNode(`version ${nodePack.version}`));

    if (nodePack.installedByDefault) {
      detailsUl.appendChild(document.createElement('li'))
      .appendChild(document.createTextNode('default'));
    }

    li.appendChild(document.createElement('h1'))
    .appendChild(document.createTextNode(nodePack.name));

    if (nodePack.description) {
      li.appendChild(document.createElement('p'))
      .appendChild(document.createTextNode(nodePack.description));
    }

    const nodesUl = li.appendChild(document.createElement('ul'));
    nodesUl.classList.add('nodes', 'xible');
    nodePack.nodes.forEach((node) => {
      node.nodeExists = true;
      const editorNode = new XibleEditorNode(node);

      nodesUl.appendChild(document.createElement('li'))
      .appendChild(editorNode.element);

      editorNode.editor = dummyEditor;
      editorNode.emit('beforeAppend');
      editorNode.emit('append');
    });

    const actionsDiv = li.appendChild(document.createElement('div'));
    actionsDiv.classList.add('actions');

    if (!nodePack.installedByDefault) {
      const deleteButton = actionsDiv.appendChild(document.createElement('button'));
      deleteButton.appendChild(document.createTextNode('Delete'));
      deleteButton.addEventListener('click', () => {

      });
    }

    return li;
  }
};
