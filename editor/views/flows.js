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

  filterInput.addEventListener('input', () => {
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
  });

  async function populateFlows() {
    const flows = await xibleWrapper.Flow.getAll();

    for (const flowId in flows) {
      flowsTbody.appendChild(await createFlowRow(flows[flowId]));
    }
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

    flow.on('deleteInstance', () => {
      instanceLength -= 1;
      instancesTd.innerHTML = instanceLength;
    });

    flow.on('createInstance', ({ flowInstance }) => {
      stateUl.appendChild(createInstanceCell(flowInstance));
      instanceLength += 1;
      instancesTd.innerHTML = instanceLength;
    });

    flow.on('delete', () => {
      if (tr.parentNode) {
        tr.parentNode.removeChild(tr);
      }
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

    instance.on('initializing', () => {
      setInstanceState(li, instance);
    });

    instance.on('initialized', () => {
      setInstanceState(li, instance);
    });

    instance.on('started', () => {
      setInstanceState(li, instance);
    });

    instance.on('starting', () => {
      setInstanceState(li, instance);
    });

    instance.on('stopping', () => {
      setInstanceState(li, instance);
    });

    instance.on('stopped', () => {
      setInstanceState(li, instance);
    });

    instance.on('delete', () => {
      if (li.parentNode) {
        li.parentNode.removeChild(li);
      }
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
  populateFlows();
};
