'use strict';

View.routes['/nodes'] = async (EL) => {
  EL.innerHTML = `
    <div id="sub">
      <header>XIBLE</header>
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
        <ul id="nodepacks">
        </ul>
      </section>
    </div>
  `;

  const nodePackUl = document.getElementById('nodepacks');

  const nodePacks = await xibleWrapper.NodePack.getAll();
  if (!nodePacks.length) {

  }

  for (let i = 0; i < nodePacks.length; i += 1) {
    nodePackUl.appendChild(createNodePackEl(nodePacks[i]));
  }
};

function createNodePackEl(nodePack) {
  const li = document.createElement('li');

  li.appendChild(document.createElement('h1'))
  .appendChild(document.createTextNode(nodePack.name));

  if (nodePack.description) {
    li.appendChild(document.createElement('p'))
    .appendChild(document.createTextNode(nodePack.description));
  }

  return li;
}