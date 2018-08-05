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
    const filterValue = filterInput.value.toLowerCase().trim();

    for (let i = 0; i < flowsTbody.rows.length; i += 1) {
      if (
        !filterValue || (
          !flowsTbody.rows[i].classList.contains('instances') &&
          flowsTbody.rows[i].cells[0].innerText.toLowerCase().includes(filterValue)
        ) || (
          flowsTbody.rows[i].classList.contains('instances') &&
          flowsTbody.rows[i].previousSibling.style.display !== 'none'
        )
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

    tr.addEventListener('click', (event) => {
      if (event.target && XibleEditor.inputElementNameList.includes(event.target.nodeName)) {
        return;
      }

      if (tr.classList.contains('expand')) {
        closeFlowRow(tr);
      } else {
        Array.from(tr.parentNode.querySelectorAll('.expand')).forEach((expandedTr) => {
          closeFlowRow(expandedTr);
        });
        tr.classList.add('expand');
        expandFlowRow(tr, flow);
      }
    });

    const instances = await flow.getInstances();
    let instanceLength = instances.length;
    const instancesTd = tr.appendChild(document.createElement('td'));
    instancesTd.classList.add('instance-count');
    instancesTd.innerHTML = instanceLength;

    const stateTd = tr.appendChild(document.createElement('td'));
    stateTd.classList.add('state');
    const stateUl = stateTd.appendChild(document.createElement('ul'));
    instances.forEach((instance) => {
      createInstanceCell(stateUl, tr, instance);
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
      const deletePrompt = customPrompt(`
        <h1>Stop instance</h1>
        <p>
          Are you sure you want to permanently delete flow &quot;<span style="font-weight: bold;"></span>&quot;?
        </p>
      `, 'Confirm');

      deletePrompt.form.querySelector('span').appendChild(document.createTextNode(flow._id));

      deletePrompt.form.addEventListener('submit', () => {
        deletePrompt.remove();
        flow.delete();
      });
    };

    function flowOnDeleteInstance({ flowInstance }) {
      instanceLength -= 1;
      instancesTd.innerHTML = instanceLength;

      if (tr.classList.contains('expand')) {
        const instanceLi = document.querySelector(`ul.instances>li.instance-${flowInstance._id}`);
        if (instanceLi) {
          instanceLi.parentNode.removeChild(instanceLi);
        }
      }
    }
    flow.on('deleteInstance', flowOnDeleteInstance);

    function flowOnCreateInstance({ flowInstance }) {
      createInstanceCell(stateUl, tr, flowInstance);
      instanceLength += 1;
      instancesTd.innerHTML = instanceLength;

      if (tr.classList.contains('expand')) {
        flowRowAddInstance(tr.nextSibling.querySelector('ul.instances'), flow, flowInstance);
      }
    }
    flow.on('createInstance', flowOnCreateInstance);

    function flowOnDelete() {
      if (tr.parentNode) {
        closeFlowRow(tr);
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

  function createInstanceCell(stateUl, tr, flowInstance) {
    const li = stateUl.appendChild(document.createElement('li'));
    li.classList.add(`instance-${flowInstance._id}`);
    setInstanceState(tr, flowInstance);

    function flowInstanceOnStateChange() {
      setInstanceState(tr, flowInstance);
    }

    flowInstance.on('initializing', flowInstanceOnStateChange);
    flowInstance.on('initialized', flowInstanceOnStateChange);
    flowInstance.on('started', flowInstanceOnStateChange);
    flowInstance.on('starting', flowInstanceOnStateChange);
    flowInstance.on('stopping', flowInstanceOnStateChange);
    flowInstance.on('stopped', flowInstanceOnStateChange);

    mainViewHolder.once('purge', () => {
      flowInstance.removeListener('initializing', flowInstanceOnStateChange);
      flowInstance.removeListener('initialized', flowInstanceOnStateChange);
      flowInstance.removeListener('started', flowInstanceOnStateChange);
      flowInstance.removeListener('starting', flowInstanceOnStateChange);
      flowInstance.removeListener('stopping', flowInstanceOnStateChange);
      flowInstance.removeListener('stopped', flowInstanceOnStateChange);
    });

    function flowInstanceOnDelete() {
      if (li.parentNode) {
        li.parentNode.removeChild(li);
      }
    }
    flowInstance.on('delete', flowInstanceOnDelete);
    mainViewHolder.once('purge', () => {
      flowInstance.removeListener('delete', flowInstanceOnDelete);
    });

    return li;
  }

  function setInstanceState(tr, flowInstance) {
    const li = tr.querySelector(`td.state li.instance-${flowInstance._id}`);
    if (li) {
      li.className = '';
      li.classList.add(`instance-${flowInstance._id}`, `state-${flowInstance.state}`);
      if (flowInstance.directed) {
        li.classList.add('directed');
      }
      li.innerHTML = flowInstance.state;
    }

    const instanceLiState = document.querySelector(`ul.instances>li.instance-${flowInstance._id} .state`);
    if (instanceLiState) {
      instanceLiState.className = 'state';
      instanceLiState.classList.add(`state-${flowInstance.state}`);
      if (flowInstance.directed) {
        instanceLiState.classList.add('directed');
        instanceLiState.innerHTML = 'directed';
      } else {
        instanceLiState.innerHTML = ['stopped', 'stopping', 'initializing', 'initialized', 'starting', 'started'][flowInstance.state];
      }
    }
  }

  async function flowRowAddInstance(ul, flow, instance) {
    const li = ul.appendChild(document.createElement('li'));
    li.classList.add(`instance-${instance._id}`);

    // stop button
    const stopButton = li.appendChild(document.createElement('button'));
    stopButton.innerHTML = 'Stop';
    stopButton.addEventListener('click', () => {
      const stopPrompt = customPrompt(`
        <h1>Stop instance</h1>
        <p>
          Are you sure you want to stop this instance?
        </p>
      `, 'Confirm');

      stopPrompt.form.addEventListener('submit', () => {
        stopPrompt.remove();
        instance.delete();
      });
    });

    // state
    const stateEl = li.appendChild(document.createElement('div'));
    stateEl.classList.add('state', `state-${instance.state}`);
    stateEl.setAttribute('title', 'State');
    if (instance.directed) {
      stateEl.classList.add('directed');
      stateEl.innerHTML = 'directed';
    } else {
      stateEl.appendChild(document.createTextNode(['stopped', 'stopping', 'initializing', 'initialized', 'starting', 'started'][instance.state]));
    }

    // timings
    const now = Date.now();
    let runTime = 0;

    if (instance.timing.startDate) {
      runTime = now - instance.timing.startDate;
    }

    const runtimeUl = li.appendChild(document.createElement('ul'));
    runtimeUl.classList.add('timing');
    runtimeUl.innerHTML = `
      <li class="runTime" title="Running for ...">&nbsp;</li>
      <li class="startDate" title="Start date">&nbsp;</li>
      <li class="startupDuration" title="Startup duration">&nbsp;</li>
    `;

    updateInstanceTimings(li, instance);

    const updateInstanceTimingsInterval = window.setInterval(() => {
      updateInstanceTimings(li, instance);
    }, runTime > 60000 ? 60000 : 1000);

    // params checkbox
    const paramsTextarea = li.appendChild(document.createElement('textarea'));
    paramsTextarea.disabled = true;
    paramsTextarea.setAttribute('rows', 5);
    paramsTextarea.appendChild(document.createTextNode(instance.params ? JSON.stringify(instance.params, null, '  ') : ''));

    // resource charts
    const resourceUl = li.appendChild(document.createElement('ul'));
    resourceUl.classList.add('stats');
    const cpuResourceLi = resourceUl.appendChild(document.createElement('li'));
    cpuResourceLi.innerHTML = `
      <div>
        <canvas></canvas>
      </div>
      <label id="cpu">cpu</label>
    `;

    const memResourceLi = resourceUl.appendChild(document.createElement('li'));
    memResourceLi.innerHTML = `
      <div>
        <canvas></canvas>
      </div>
      <label id="rss">rss</label>
      <label id="heapTotal">heap total</label>
      <label id="heapUsed">heap used</label>
    `;

    const delayResourceLi = resourceUl.appendChild(document.createElement('li'));
    delayResourceLi.innerHTML = `
      <div>
        <canvas></canvas>
      </div>
      <label id="delay">event loop delay</label>
    `;
    const { cpuChart, memChart, delayChart } = createResourceCharts(
      cpuResourceLi.querySelector('canvas'),
      memResourceLi.querySelector('canvas'),
      delayResourceLi.querySelector('canvas')
    );

    const usageHandler = (json) => {
      if (json.method !== 'xible.flow.usage' || !json.usage) {
        return;
      }

      updateResourceCharts(flow, json.usage, cpuChart, memChart, delayChart, instance);
    };

    xibleWrapper.on('message', usageHandler);

    flow.on('delete', () => {
      xibleWrapper.removeListener('message', usageHandler);
      clearInterval(updateInstanceTimingsInterval);
    });

    instance.on('delete', () => {
      xibleWrapper.removeListener('message', usageHandler);
      clearInterval(updateInstanceTimingsInterval);
    });
  }

  function updateInstanceTimings(instanceLi, instance) {
    const runTimeLi = instanceLi.querySelector('.timing .runTime');
    const startDateLi = instanceLi.querySelector('.timing .startDate');
    const startupDurationLi = instanceLi.querySelector('.timing .startupDuration');

    const now = Date.now();
    let runTime = '&nbsp;';
    let runNumber = 0;

    if (instance.timing.startDate) {
      runTime = now - instance.timing.startDate;
      if (runTime > 3600000) {
        runNumber = Math.floor(runTime / 3600000);
        runTime = `${runNumber} hour`;
      } else if (runTime > 60000) {
        runNumber = Math.floor(runTime / 60000);
        runTime = `${runNumber} minute`;
      } else {
        runNumber = Math.floor(runTime / 1000);
        runTime = `${runNumber} second`;
      }

      if (runNumber > 1) {
        runTime += 's';
      }
    }
    runTimeLi.innerHTML = runTime;

    startDateLi.innerHTML = instance.timing.startDate ? new Date(instance.timing.startDate).toLocaleString() : '&nbsp;';

    const createTime = Math.round(
      ((instance.timing.createEnd[0] - instance.timing.createStart[0]) * 1000) +
      ((instance.timing.createEnd[1] - instance.timing.createStart[1]) / 1e6)
    );

    let initTime = 0;
    if (instance.timing.initEnd) {
      initTime = Math.round(
        ((instance.timing.initEnd[0] - instance.timing.initStart[0]) * 1000) +
        ((instance.timing.initEnd[1] - instance.timing.initStart[1]) / 1e6)
      );
    }

    let startTime = 0;
    if (instance.timing.startEnd) {
      startTime = Math.round(
        ((instance.timing.startEnd[0] - instance.timing.startStart[0]) * 1000) +
        ((instance.timing.startEnd[1] - instance.timing.startStart[1]) / 1e6)
      );
    }
    startupDurationLi.innerHTML = `${createTime + initTime + startTime}ms`;
  }

  async function expandFlowRow(tr, flow) {
    const expandedTr = document.createElement('tr');
    expandedTr.classList.add('instances');
    const td = expandedTr.appendChild(document.createElement('td'));
    td.setAttribute('colspan', 4);

    const ul = td.appendChild(document.createElement('ul'));
    ul.classList.add('instances');
    const instances = await flow.getInstances();
    instances.forEach((instance) => {
      flowRowAddInstance(ul, flow, instance);
    });

    if (tr.nextSibling) {
      tr.parentNode.insertBefore(expandedTr, tr.nextSibling);
    } else {
      tr.parentNode.appendChild(expandedTr);
    }
  }

  function closeFlowRow(tr) {
    if (!tr.classList.contains('expand')) {
      return;
    }
    tr.classList.remove('expand');

    if (tr.nextSibling && tr.nextSibling.classList.contains('instances')) {
      tr.parentNode.removeChild(tr.nextSibling);
    }
  }

  // clear all flow statuses when connection closes
  function xibleWrapperOnOpen() {
    populateFlows();
  }

  if (xibleWrapper.readyState === XibleWrapper.STATE_OPEN) {
    xibleWrapperOnOpen();
  }

  xibleWrapper.on('open', xibleWrapperOnOpen);
};
