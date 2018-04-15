'use strict';

View.routes['/flows'] = (EL) => {
  EL.innerHTML = `
    <div id="sub">
      <header>XIBLE</header>
      <p id="connectionLost" class="status loading alert hidden">
        Connection lost
      </p>
      <section>
        <h1>Filter</h1>
        <form>
          <input type="text" placeholder="filter" id="filter" />
        </form>
      </section>
      <!--
      <section>
        <h1>Registry</h1>
        <ul>
          <li><a href="" onclick="">Search</a></li>
        </ul>
      </section>
      -->
    </div>
    <div class="inner" id="flowsContent">
      <section>
        <h1>Flows</h1>
        <table id="flowsTable">
          <colgroup>
            <col style="width: 20%;" />
            <col style="width: 10%;" />
            <col style="width: 30%;" />
            <col style="width: 40%;" />
          </colgroup>
          <thead>
            <tr>
              <th>name</th>
              <th class="instances">instances</th>
              <th>state</th>
              <th class="actions">actions</th>
            </tr>
          </thead>
          <tbody id="flowsTbody">
          </tbody>
        </table>
      </section>
    </div>
  `;

  const filterInput = document.getElementById('filter');
  const flowsTbody = document.getElementById('flowsTbody');

  function filterInputOnInput() {
    const filterValue = filterInput.value.toLowerCase();

    for (let i = 0; i < flowsTbody.rows.length; i += 1) {
      if (
        !filterValue ||
        flowsTbody.rows[i].cells[0].innerText.toLowerCase().includes(filterValue)
      ) {
        flowsTbody.rows[i].style.display = '';
      } else {
        flowsTbody.rows[i].style.display = 'none';
      }
    }
  }
  filterInput.addEventListener('input', filterInputOnInput);

  async function populateFlows() {
    const flows = await xibleWrapper.Flow.getAll();

    flowsTbody.innerHTML = '';
    for (const flowId in flows) {
      flowsTbody.appendChild(await createFlowRow(flows[flowId]));
    }
    filterInputOnInput();
  }

  async function createFlowRow(flow) {
    const tr = document.createElement('tr');
    tr.appendChild(document.createElement('td')).appendChild(document.createTextNode(flow._id));

    const instances = await flow.getInstances();
    let instanceLength = instances.length;
    const instancesTd = tr.appendChild(document.createElement('td'));
    instancesTd.classList.add('instances');
    instancesTd.innerHTML = instanceLength;

    const stateTd = tr.appendChild(document.createElement('td'));
    stateTd.classList.add('state');
    const stateUl = stateTd.appendChild(document.createElement('ul'));
    instances.forEach((instance) => {
      stateUl.appendChild(createInstanceCell(instance));
    });

    const actionTd = tr.appendChild(document.createElement('td'));
    actionTd.classList.add('actions');

    const startButton = actionTd.appendChild(document.createElement('button'));
    startButton.innerHTML = 'Start';
    startButton.onclick = () => {
      flow.createInstance({ start: true });
    };

    const stopButton = actionTd.appendChild(document.createElement('button'));
    stopButton.innerHTML = 'Stop all';
    stopButton.onclick = () => {
      flow.deleteAllInstances();
    };

    const deleteButton = actionTd.appendChild(document.createElement('button'));
    deleteButton.innerHTML = 'Delete';
    deleteButton.onclick = () => {
      if (window.confirm(`Are you sure you want to permanently delete flow "${flow._id}"?`)) {
        flow.delete();
      }
    };

    function flowOnDeleteInstance() {
      instanceLength -= 1;
      instancesTd.innerHTML = instanceLength;
    }
    flow.on('deleteInstance', flowOnDeleteInstance);

    function flowOnCreateInstance({ flowInstance }) {
      stateUl.appendChild(createInstanceCell(flowInstance));
      instanceLength += 1;
      instancesTd.innerHTML = instanceLength;
    }
    flow.on('createInstance', flowOnCreateInstance);

    function flowOnDelete() {
      if (tr.parentNode) {
        tr.parentNode.removeChild(tr);
      }
    }
    flow.on('delete', flowOnDelete);

    mainViewHolder.once('purge', () => {
      flow.removeListener('deleteInstance', flowOnDeleteInstance);
      flow.removeListener('createInstance', flowOnCreateInstance);
      flow.removeListener('delete', flowOnDelete);
    });

    return tr;
  }

  function createInstanceCell(instance) {
    const li = document.createElement('li');
    setInstanceState(li, instance);

    li.onclick = () => {
      if (window.confirm(`Stop flow instance which is running with these params?\r\n${JSON.stringify(instance.params, null, '  ')}`)) {
        instance.stop();
      }
    };

    function flowInstanceOnStateChange() {
      setInstanceState(li, instance);
    }

    instance.on('initializing', flowInstanceOnStateChange);
    instance.on('initialized', flowInstanceOnStateChange);
    instance.on('started', flowInstanceOnStateChange);
    instance.on('starting', flowInstanceOnStateChange);
    instance.on('stopping', flowInstanceOnStateChange);
    instance.on('stopped', flowInstanceOnStateChange);

    mainViewHolder.once('purge', () => {
      instance.removeListener('initializing', flowInstanceOnStateChange);
      instance.removeListener('initialized', flowInstanceOnStateChange);
      instance.removeListener('started', flowInstanceOnStateChange);
      instance.removeListener('starting', flowInstanceOnStateChange);
      instance.removeListener('stopping', flowInstanceOnStateChange);
      instance.removeListener('stopped', flowInstanceOnStateChange);
    });

    function flowInstanceOnDelete() {
      if (li.parentNode) {
        li.parentNode.removeChild(li);
      }
    }
    instance.on('delete', flowInstanceOnDelete);
    mainViewHolder.once('purge', () => {
      instance.removeListener('delete', flowInstanceOnDelete);
    });

    return li;
  }

  function setInstanceState(li, instance) {
    li.className = '';
    li.classList.add(`state-${instance.state}`);
    if (instance.directed) {
      li.classList.add('directed');
    }
    li.innerHTML = instance.state;
  }
  /*
  async function expandFlowRow(tr, flow) {
    const expandedTr = document.createElement('tr');
    const td = expandedTr.appendChild(document.createElement('td'));
    td.setAttribute('colspan', 4);

    const instances = await flow.getInstances();
    instances.forEach((instance) => {
      const li = document.createElement('li');
    });

    if (tr.nextSibling) {
      tr.parentNode.insertBefore(expandedTr, tr.nextSibling);
    } else {
      tr.parentNode.appendChild(expandedTr);
    }
  }
  */

  // clear all flow statuses when connection closes
  function xibleWrapperOnOpen() {
    populateFlows();
  }

  if (xibleWrapper.readyState === XibleWrapper.STATE_OPEN) {
    xibleWrapperOnOpen();
  }

  xibleWrapper.on('open', xibleWrapperOnOpen);
};
