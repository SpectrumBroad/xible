'use strict';

View.routes['/flows'] = (EL) => {
  EL.innerHTML = `
    <div id="sub">
      <header>XIBLE</header>
      <p id="connectionLost" class="status loading alert hidden">
        Connection lost
      </p>
      <section class="buttons">
        <button type="button" id="xibleFlowCreateButton">Create</button>
      </section>
      <section>
        <h1>Filter</h1>
        <form>
          <input type="text" placeholder="filter" id="filter" />
        </form>
      </section>
      <section>
        <h1>Registry</h1>
        <form id="subRegistryFlowSearchForm">
          <input type="text" placeholder="search" id="subRegistrySearchInput" />
          <button type="submit">Search</button>
        </form>
      </section>
    </div>
    <div class="inner" id="flowsContent">
      <section>
        <h1>Flows</h1>
        <section id="flowsInstalledSection" class="open">
          <h2 id="flowsInstalledHeading">Installed <span></span></h2>
          <div>
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
          </div>
        </section>
        <section id="flowsRegistrySection">
          <h2 id="flowsRegistryHeading">Registry <span></span></h2>
          <form id="registryFlowSearchForm">
            <input type="text" placeholder="search" id="registrySearchInput" />
          </form>
          <div>
            <p id="registryFlowsNoResultsWarning" class="warning" style="display: none;">
              Your search yielded no results.
            </p>
            <table id="registryFlowsTable" style="display: none;">
              <colgroup>
                <col style="width: 60%;" />
                <col style="width: 40%;" />
              </colgroup>
              <thead>
                <tr>
                  <th>name</th>
                  <th class="actions">actions</th>
                </tr>
              </thead>
              <tbody id="registryFlowsTbody">
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </div>
  `;

  const flowsInstalledHeading = document.getElementById('flowsInstalledHeading');
  const flowsInstalledSection = document.getElementById('flowsInstalledSection');
  const flowsRegistryHeading = document.getElementById('flowsRegistryHeading');
  const flowsRegistrySection = document.getElementById('flowsRegistrySection');
  const registryFlowsNoResultsWarning = document.getElementById('registryFlowsNoResultsWarning');
  const registryFlowsTable = document.getElementById('registryFlowsTable');

  flowsInstalledHeading.addEventListener('click', () => {
    flowsInstalledSection.classList.toggle('open');
  });

  flowsRegistryHeading.addEventListener('click', () => {
    flowsRegistrySection.classList.toggle('open');
  });

  document.getElementById('xibleFlowCreateButton').addEventListener('click', async () => {
    await mainViewHolder.navigate('/editor');
    const addButton = document.querySelector('#flowList>.add a');
    if (!addButton) {
      return;
    }

    addButton.click();
  });

  const registryFlowsTbody = document.getElementById('registryFlowsTbody');
  const subRegistryFlowSearchInput = document.getElementById('subRegistrySearchInput');
  const registryFlowSearchInput = document.getElementById('registrySearchInput');
  const subRegistryFlowSearchForm = document.getElementById('subRegistryFlowSearchForm');
  const registryFlowSearchForm = document.getElementById('registryFlowSearchForm');

  async function installFlowByName(flowName) {
    await xibleWrapper.Registry.installFlowByName(flowName);
    await populateFlows();

    mainViewHolder.navigate(`/flows/${encodeURIComponent(flowName)}`);
  }

  async function searchRegistryFlows(searchString) {
    registryFlowsTbody.innerHTML = '';
    flowsInstalledSection.classList.remove('open');
    flowsRegistrySection.classList.add('open');

    searchString = searchString.trim();
    if (!searchString) {
      return;
    }

    registryFlowSearchForm.classList.add('loading');
    registryFlowsNoResultsWarning.style.display = 'none';
    registryFlowsTable.style.display = 'none';

    const foundFlows = await xibleWrapper.Registry.searchFlows(searchString);

    registryFlowSearchForm.addEventListener('animationiteration', () => {
      registryFlowSearchForm.classList.remove('loading');
    }, { once: true });
    registryFlowsTable.style.display = '';

    const flowIds = Object.keys(foundFlows);
    if (!flowIds.length) {
      registryFlowsNoResultsWarning.style.display = '';
      return;
    }

    for (const flowId of flowIds) {
      const tr = registryFlowsTbody.appendChild(document.createElement('tr'));
      tr.appendChild(document.createElement('td')).appendChild(document.createTextNode(flowId));

      const actionTd = tr.appendChild(document.createElement('td'));
      actionTd.classList.add('actions');
      const installButton = actionTd.appendChild(document.createElement('button'));
      installButton.innerHTML = 'Install';
      installButton.onclick = async () => {
        const existingFlow = await xibleWrapper.Flow.getById(flowId);
        if (!existingFlow) {
          installFlowByName(flowId);
        } else {
          const overwritePrompt = customPrompt(`
            <h1>Flow already exists</h1>
            <p>
              A flow named &quot;<span style="font-weight: bold;"></span>&quot; already exists.
              Do you wish to overwrite this flow?
            </p>
          `, 'Confirm');

          overwritePrompt.form.querySelector('span').appendChild(document.createTextNode(flowId));

          overwritePrompt.form.addEventListener('submit', () => {
            overwritePrompt.remove();
            installFlowByName(flowId);
          });
        }
      };
    }
  }

  subRegistryFlowSearchForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    searchRegistryFlows(subRegistryFlowSearchInput.value);
  });

  registryFlowSearchForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    searchRegistryFlows(registryFlowSearchInput.value);
  });

  subRegistryFlowSearchInput.addEventListener('input', () => {
    registryFlowSearchInput.value = subRegistryFlowSearchInput.value;
  });

  registryFlowSearchInput.addEventListener('input', () => {
    subRegistryFlowSearchInput.value = registryFlowSearchInput.value;
  });

  const filterInput = document.getElementById('filter');
  const flowsTbody = document.getElementById('flowsTbody');

  function filterInputOnInput() {
    const filterValue = filterInput.value.toLowerCase().trim();
    const rows = [...flowsTbody.rows, ...registryFlowsTbody.rows];
    for (let i = 0; i < rows.length; i += 1) {
      if (
        !filterValue || (
          !rows[i].classList.contains('instances')
          && rows[i].cells[0].innerText.toLowerCase().includes(filterValue)
        ) || (
          rows[i].classList.contains('instances')
          && rows[i].previousSibling.style.display !== 'none'
        )
      ) {
        rows[i].style.display = '';
      } else {
        rows[i].style.display = 'none';
      }
    }
  }
  filterInput.addEventListener('input', filterInputOnInput);

  async function populateFlows() {
    const flows = await xibleWrapper.Flow.getAll();

    // if this view is already loaded,
    // this will remove eventlisteners.
    mainViewHolder.emit('purge');
    flowsTbody.innerHTML = '';

    for (const flowId in flows) {
      await createFlowRow(flows[flowId]);
    }
    filterInputOnInput();
  }

  async function createFlowRow(flow) {
    const tr = flowsTbody.appendChild(document.createElement('tr'));
    tr._flow = flow;
    tr.appendChild(document.createElement('td')).appendChild(document.createTextNode(flow._id));

    function trOnClick(event) {
      if (event && event.target && XibleEditor.inputElementNameList.includes(event.target.nodeName)) {
        return;
      }

      if (tr.classList.contains('expand')) {
        mainViewHolder.navigate('/flows', true);
        closeFlowRow(tr);
      } else {
        Array.from(flowsTbody.querySelectorAll('.expand')).forEach((expandedTr) => {
          closeFlowRow(expandedTr);
        });

        mainViewHolder.navigate(`/flows/${encodeURIComponent(flow._id)}`, true);
        tr.classList.add('expand');
        return expandFlowRow(tr);
      }
    }

    tr.addEventListener('click', trOnClick);

    // if in path, load it immediately
    const pathSplit = window.location.pathname.split('/');
    if (pathSplit.length > 1 && pathSplit[2] === encodeURIComponent(flow._id)) {
      await trOnClick();
      tr.scrollIntoView(true);
    }

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

    const editButton = actionTd.appendChild(document.createElement('button'));
    editButton.innerHTML = 'Edit';
    editButton.onclick = () => {
      mainViewHolder.navigate(`/editor/${encodeURIComponent(flow._id)}`);
    };

    const startButton = actionTd.appendChild(document.createElement('button'));
    startButton.innerHTML = 'Start';
    startButton.onclick = () => startFlow(flow);

    const stopButton = actionTd.appendChild(document.createElement('button'));
    stopButton.innerHTML = 'Stop all';
    stopButton.onclick = () => {
      flow.deleteAllInstances();
    };

    const deleteButton = actionTd.appendChild(document.createElement('button'));
    deleteButton.innerHTML = 'Delete';
    deleteButton.onclick = () => deleteFlow(flow);

    function flowOnDeleteInstance({ flowInstance }) {
      instanceLength -= 1;
      instancesTd.innerHTML = instanceLength;

      if (tr.classList.contains('expand')) {
        const instanceLi = document.querySelector(`ul.instances>li.instance-${flowInstance._id}`);
        if (instanceLi) {
          setTimeout(() => {
            if (!instanceLi.parentNode) {
              return;
            }
            instanceLi.parentNode.removeChild(instanceLi);
          }, 10000);
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

    function flowInstanceOnDelete() {
      if (li.parentNode) {
        li.parentNode.removeChild(li);
      }
    }
    flowInstance.on('delete', flowInstanceOnDelete);

    function flowInstanceOnError(err) {
      setInstanceState(tr, flowInstance, err);
    }
    flowInstance.on('error', flowInstanceOnError);

    mainViewHolder.once('purge', () => {
      flowInstance.removeListener('initializing', flowInstanceOnStateChange);
      flowInstance.removeListener('initialized', flowInstanceOnStateChange);
      flowInstance.removeListener('started', flowInstanceOnStateChange);
      flowInstance.removeListener('starting', flowInstanceOnStateChange);
      flowInstance.removeListener('stopping', flowInstanceOnStateChange);
      flowInstance.removeListener('stopped', flowInstanceOnStateChange);

      flowInstance.removeListener('delete', flowInstanceOnDelete);

      flowInstance.removeListener('error', flowInstanceOnError);
    });

    return li;
  }

  function setInstanceState(tr, flowInstance, err) {
    if (tr) {
      const li = tr.querySelector(`td.state li.instance-${flowInstance._id}`);
      if (li) {
        li.className = '';
        li.classList.add(`instance-${flowInstance._id}`, `state-${flowInstance.state}`);
        if (err) {
          li.classList.add('error');
        } else if (flowInstance.directed) {
          li.classList.add('directed');
        }
        li.innerHTML = flowInstance.state;
      }
    }

    const instanceLi = document.querySelector(`ul.instances>li.instance-${flowInstance._id}`);
    if (instanceLi) {
      const instanceLiState = instanceLi.querySelector('.state');
      if (flowInstance.state < 2) {
        instanceLi.querySelector('button').disabled = true;
      } else {
        instanceLi.querySelector('button').disabled = false;
      }

      const hadErrorClass = instanceLiState.classList.contains('error');
      instanceLiState.className = 'state';
      instanceLiState.classList.add(`state-${flowInstance.state}`);
      if (err || (hadErrorClass && flowInstance.state < 2)) {
        instanceLiState.classList.add('error');
        instanceLiState.innerHTML = 'error';
      } else if (flowInstance.directed) {
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
    setInstanceState(null, instance);

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

    li._flowInstanceParamsUpdateListener = () => {
      paramsTextarea.innerHTML = '';
      paramsTextarea.appendChild(document.createTextNode(instance.params ? JSON.stringify(instance.params, null, '  ') : ''));
    };
    li._flowInstanceParamsUpdateListener();
    instance.on('starting', li._flowInstanceParamsUpdateListener);

    // resource charts
    const resourceUl = li.appendChild(document.createElement('ul'));
    resourceUl.classList.add('stats');
    const cpuResourceLi = resourceUl.appendChild(document.createElement('li'));
    cpuResourceLi.classList.add('chart');
    cpuResourceLi.innerHTML = `
      <div>
        <canvas></canvas>
      </div>
      <label id="cpu">cpu</label>
    `;

    const memResourceLi = resourceUl.appendChild(document.createElement('li'));
    memResourceLi.classList.add('chart');
    memResourceLi.innerHTML = `
      <div>
        <canvas></canvas>
      </div>
      <label id="rss">rss</label>
      <label id="heapTotal">heap total</label>
      <label id="heapUsed">heap used</label>
    `;

    const delayResourceLi = resourceUl.appendChild(document.createElement('li'));
    delayResourceLi.classList.add('chart');
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

    li._instance = instance;
    li._flowInstanceDeleteListener = () => {
      xibleWrapper.removeListener('message', usageHandler);
      clearInterval(updateInstanceTimingsInterval);
    };
    instance.on('delete', li._flowInstanceDeleteListener);
    flow.on('delete', li._flowInstanceDeleteListener);
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
      ((instance.timing.createEnd[0] - instance.timing.createStart[0]) * 1000)
      + ((instance.timing.createEnd[1] - instance.timing.createStart[1]) / 1e6)
    );

    let initTime = 0;
    if (instance.timing.initEnd) {
      initTime = Math.round(
        ((instance.timing.initEnd[0] - instance.timing.initStart[0]) * 1000)
        + ((instance.timing.initEnd[1] - instance.timing.initStart[1]) / 1e6)
      );
    }

    let startTime = 0;
    if (instance.timing.startEnd) {
      startTime = Math.round(
        ((instance.timing.startEnd[0] - instance.timing.startStart[0]) * 1000)
        + ((instance.timing.startEnd[1] - instance.timing.startStart[1]) / 1e6)
      );
    }
    startupDurationLi.innerHTML = `${createTime + initTime + startTime}ms`;
  }

  async function expandFlowRow(tr) {
    const expandedTr = document.createElement('tr');
    expandedTr.classList.add('instances');
    expandedTr.innerHTML = `
      <td colspan="4" class="loading">
        <ul class="instances"></ul>
      </td>
    `;
    const td = expandedTr.querySelector('td');

    if (tr.nextSibling) {
      tr.parentNode.insertBefore(expandedTr, tr.nextSibling);
    } else {
      tr.parentNode.appendChild(expandedTr);
    }

    const ul = td.querySelector('ul');
    const instances = await tr._flow.getInstances();
    instances.forEach((instance) => {
      flowRowAddInstance(ul, tr._flow, instance);
    });

    td.addEventListener('animationiteration', () => {
      td.classList.remove('loading');
    }, {
      once: true
    });

    tr._purgeCloseFlowRowListener = () => {
      closeFlowRow(tr);
    };

    mainViewHolder.once('purge', tr._purgeCloseFlowRowListener);
  }

  function closeFlowRow(tr) {
    if (!tr.classList.contains('expand')) {
      return;
    }
    tr.classList.remove('expand');

    const flow = tr._flow;
    mainViewHolder.removeListener('purge', tr._purgeCloseFlowRowListener);
    delete tr._purgeCloseFlowRowListener;

    if (tr.nextSibling && tr.nextSibling.classList.contains('instances')) {
      Array.from(tr.nextSibling.querySelectorAll('ul.instances>li'))
        .forEach((li) => {
          flow.removeListener('delete', li._flowInstanceDeleteListener);
          li._instance.removeListener('delete', li._flowInstanceDeleteListener);
          li._instance.removeListener('starting', li._flowInstanceParamsUpdateListener);
          delete li._instance;
          delete li._flowInstanceDeleteListener;
          delete li._flowInstanceParamsUpdateListener;
        });
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
  mainViewHolder.once('purge', () => {
    xibleWrapper.removeListener('open', xibleWrapperOnOpen);
  });
};
