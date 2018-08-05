'use strict';

function editorView(EL) {
  EL.innerHTML = `
    <div id="sub">
      <header>XIBLE<!--<span>ENTERPRISE</span>--></header>
      <p id="connectionLost" class="status loading alert hidden">
        Connection lost
      </p>
      <p id="validateWritePermissions" class="status loading">
        Validating write permissions
      </p>
      <p id="browserSupportAttachShadow" class="status alert hidden">
        Your browser does not support the necessary features to enable all editor functionality.
      </p>
      <p id="flowNotRunnable" class="status alert hidden">
        This flow cannot be started because it contains nodes that don't exist in the given configuration.
      </p>
      <section class="buttons editor">
        <button type="button" id="xibleFlowDeployButton" disabled="disabled">Deploy</button>
        <button type="button" id="xibleFlowStartButton" disabled="disabled">Start</button>
        <button type="button" id="xibleFlowStopButton" disabled="disabled">Stop</button>
        <button type="button" id="xibleFlowSaveButton" disabled="disabled">Save</button>
        <button type="button" id="xibleFlowDeleteButton" disabled="disabled">Delete</button>
      </section>
      <ul class="tablist">
        <li class="open">
          <a id="logOpenA" href="#logs" data-section-class="log">log</a>
        </li>
        <li>
          <a id="statsOpenA" href="#resources" data-section-class="stats">resources</a>
        </li>
      </ul>
      <section id="log" class="tabcontents log">
        <ul></ul>
      </section>
      <section class="tabcontents stats" style="display: none;">
        <div>
          <canvas id="cpuChart"></canvas>
        </div>
        <label id="cpu">cpu</label>
      </section>
      <section class="tabcontents stats" style="display: none;">
        <div>
          <canvas id="memChart"></canvas>
        </div>
        <label id="rss">rss</label>
        <label id="heapTotal">heap total</label>
        <label id="heapUsed">heap used</label>
      </section>
      <section class="tabcontents stats" style="display: none;">
        <div>
          <canvas id="delayChart"></canvas>
        </div>
        <label id="delay">event loop delay</label>
      </section>
    </div>
    <div id="flowEditorHolder">
      <div class="zoomButtons">
        <button id="zoomOutButton" type="button" title="Zoom out">&#xe024;</button>
        <button id="zoomFitButton" type="button" title="Zoom to fit">&gt;</button>
        <button id="zoomResetButton" type="button" title="Reset zoom">&#xe01c;</button>
        <button id="zoomInButton" type="button" title="Zoom in">&#xe035;</button>
      </div>
      <ul id="flowList" class="flowList loading"></ul>
    </div>
  `;

  const xibleEditor = new XibleEditor(xibleWrapper);
  const permissionsValidate = document.getElementById('validateWritePermissions');

  // validate if the flows can be altered
  xibleWrapper.Flow
  .validatePermissions()
  .then((result) => {
    permissionsValidate.addEventListener('animationiteration', () => {
      permissionsValidate.classList.remove('loading');
    }, {
      once: true
    });

    if (result) {
      permissionsValidate.innerHTML = 'Write permissions check success.';
      permissionsValidate.classList.add('success');

      window.setTimeout(() => {
        permissionsValidate.parentNode.removeChild(permissionsValidate);
      }, 6000);
    } else {
      permissionsValidate.innerHTML = 'Writing to the flow path failed. Please check permissions.';
      permissionsValidate.classList.add('alert');
    }
  });

  // check if this browser supports attachShadow
  const browserSupportAttachShadowEl = document.getElementById('browserSupportAttachShadow');
  if (!xibleEditor.browserSupport) {
    browserSupportAttachShadowEl.classList.remove('hidden');

    // disable buttons that require input from content in the browser
    document.getElementById('xibleFlowDeployButton').disabled = true;
    document.getElementById('xibleFlowSaveButton').disabled = true;
  }

  // flip between logs and stats
  const logOpenEl = document.getElementById('logOpenA');
  const statsOpenEl = document.getElementById('statsOpenA');
  const logUl = document.querySelector('#log ul');

  function switchSubTab(event) {
    event.preventDefault();

    Array.from(this.parentNode.parentNode.querySelectorAll('.open'))
    .forEach((el) => {
      el.classList.remove('open');
    });

    Array.from(this.parentNode.parentNode.parentNode.querySelectorAll('section.tabcontents'))
    .forEach((section) => {
      section.style.display = 'none';
    });

    this.parentNode.classList.add('open');

    const sectionClass = this.getAttribute('data-section-class');
    Array.from(this.parentNode.parentNode.parentNode.querySelectorAll(`section.tabcontents.${sectionClass}`))
    .forEach((section) => {
      section.style.display = '';
    });

    return false;
  }

  logOpenEl.addEventListener('click', switchSubTab);
  statsOpenEl.addEventListener('click', switchSubTab);

  function getParamNames(flow) {
    const paramNames = [];
    const paramNodes = flow.getNodesByName('xible.flow.instance.param');
    for (let i = 0; i < paramNodes.length; i += 1) {
      const inputEl = paramNodes[i].editorContentEl.querySelector('input');
      if (inputEl && inputEl.value) {
        paramNames.push(inputEl.value);
      }
    }
    return paramNames;
  }

  function renderParamInputs(section, paramNames) {
    const paramInputs = {};
    if (paramNames.length) {
      section.style.display = '';

      const startFlowParamDl = section.querySelector('dl');
      paramNames.forEach((paramName) => {
        const dt = startFlowParamDl.appendChild(document.createElement('dt'));
        dt.appendChild(document.createTextNode(paramName));

        const dd = startFlowParamDl.appendChild(document.createElement('dd'));
        const input = dd.appendChild(document.createElement('input'));
        input.setAttribute('type', 'text');
        paramInputs[paramName] = input;
      });
    }
    return paramInputs;
  }

  function getParamObject(paramNames, paramInputs) {
    const params = {};
    if (paramNames.length) {
      for (const paramName in paramInputs) {
        if (paramInputs[paramName].value) {
          params[paramName] = paramInputs[paramName].value;
        }
      }
    }
    return params;
  }

  // hook buttons
  // deploy
  document.getElementById('xibleFlowDeployButton').onclick = async () => {
    // get parameter names
    const paramNames = getParamNames(xibleEditor.loadedFlow);

    // if there are no parameters and there are no instances running
    // simply deploy immediately.
    const hasInstancesRunning = await flowHasRunningInstances(xibleEditor.loadedFlow);
    if (!paramNames.length && !hasInstancesRunning) {
      const flow = await xibleEditor.loadedFlow.save();
      await flow.createInstance({ start: true });
      return;
    }

    const deployPrompt = customPrompt(`
      <h1>Deploy flow</h1>
      <p class="warning" id="startFlowAlreadyRunningWarning">
        This flow has one or more running instances.
        Deploying will stop these instances to ensure integrity across the defined flow. A single new instance is created with the new deployment.<br/>
        You can start more after the save is complete.
      </p>
      <section id="startFlowParamSection" style="display: none;">
        <h2>Parameters</h2>
        <dl></dl>
      </section>
    `, paramNames.length ? 'Submit' : 'Confirm');

    if (!hasInstancesRunning) {
      document.getElementById('startFlowAlreadyRunningWarning').style.display = 'none';
    }

    const paramInputs = renderParamInputs(document.getElementById('startFlowParamSection'), paramNames);

    deployPrompt.form.addEventListener('submit', async () => {
      const params = getParamObject(paramNames, paramInputs);

      deployPrompt.remove();

      const flow = await xibleEditor.loadedFlow.save();
      await flow.createInstance({ start: true, params });
    });
  };

  async function flowHasRunningInstances(flow) {
    if (!flow) {
      throw new Error('The "flow" argument needs to be specified');
    }

    const instances = await flow.getInstances();
    return instances.some(
      instance =>
        instance.state !== xibleWrapper.FlowInstance.STATE_STOPPED &&
        instance.state !== xibleWrapper.FlowInstance.STATE_STOPPING &&
        instance.state !== xibleWrapper.FlowInstance.STATE_INITIALIZED
    );
  }

  // start
  document.getElementById('xibleFlowStartButton').onclick = async () => {
    // get parameter names
    const paramNames = getParamNames(xibleEditor.loadedFlow);

    // if there are no parameters and there are no instances running
    // simply start immediately.
    const hasInstancesRunning = await flowHasRunningInstances(xibleEditor.loadedFlow);
    if (!paramNames.length && !hasInstancesRunning) {
      xibleEditor.loadedFlow.createInstance({ start: true });
      return;
    }

    const startPrompt = customPrompt(`
      <h1>Start flow</h1>
      <section id="startFlowPreSection">
        <h2>Prestart checklist</h2>
        <dl>
          <dd class="checkbox">
            <label for="startFlowStopInstances">
              <input type="checkbox" value="true" id="startFlowStopInstances" checked="checked" />
              <span></span>
            </label>
          </dd>
          <dt class="checkbox">
            <label for="startFlowStopInstances">
              Stop running instances
              <div>There are currently one or more instances already running for this flow.
              Check this checkbox to stop these before starting a new one.</div>
            </label>
          </dt>
        </dl>
      </section>
      <section id="startFlowParamSection" style="display: none;">
        <h2>Parameters</h2>
        <dl id="startFlowParamDl"></dl>
      </section>
    `, 'Confirm');

    if (!hasInstancesRunning) {
      document.getElementById('startFlowPreSection').style.display = 'none';
    }

    const paramInputs = renderParamInputs(document.getElementById('startFlowParamSection'), paramNames);

    startPrompt.form.addEventListener('submit', async () => {
      const params = getParamObject(paramNames, paramInputs);

      if (hasInstancesRunning) {
        const stopAllInstances = document.getElementById('startFlowStopInstances').checked;
        if (stopAllInstances) {
          await xibleEditor.loadedFlow.stopAllInstances();
        }
      }

      startPrompt.remove();
      xibleEditor.loadedFlow.createInstance({ start: true, params });
    });
  };

  // stop
  document.getElementById('xibleFlowStopButton').onclick = () => {
    xibleEditor.loadedFlow.stopAllInstances();
  };

  // save
  document.getElementById('xibleFlowSaveButton').onclick = async () => {
    if (!await flowHasRunningInstances(xibleEditor.loadedFlow)) {
      xibleEditor.loadedFlow.save();
      return;
    }

    const savePrompt = customPrompt(`
      <h1>Save flow</h1>
      <p class="warning">
        This flow has one or more running instances.
        Saving will stop these instances to ensure integrity across the defined flow.<br/>
        You can start new instances after the save is complete.
      </p>
    `, 'Confirm');

    savePrompt.form.addEventListener('submit', () => {
      savePrompt.remove();
      xibleEditor.loadedFlow.save();
    });
  };

  // delete
  document.getElementById('xibleFlowDeleteButton').onclick = () => {
    if (!xibleEditor.loadedFlow) {
      return;
    }

    if (window.confirm(`Are you sure you want to permanently delete flow "${xibleEditor.loadedFlow._id}"?`)) {
      xibleEditor.loadedFlow.delete();

      const flowTab = document.querySelector(`.flowList>li[data-flowid="${xibleEditor.loadedFlow._id}"]`);
      if (flowTab) {
        flowTab.parentNode.removeChild(flowTab);
      }
    }
  };

  const { cpuChart, memChart, delayChart } = createResourceCharts(document.getElementById('cpuChart'), document.getElementById('memChart'), document.getElementById('delayChart'));

  // update the usage charts
  function onFlowUsage(usage) {
    if (!xibleEditor.loadedFlow || !usage) {
      return;
    }

    updateResourceCharts(xibleEditor.loadedFlow, usage, cpuChart, memChart, delayChart);
  }
  xibleEditor.on('flow.usage', onFlowUsage);

  mainViewHolder.once('purge', () => {
    xibleEditor.removeListener('flow.usage', onFlowUsage);
  });

  function resetCharts() {
    while (memChart.data.datasets[0].data.length) {
      memChart.data.datasets[0].data.pop();
      memChart.data.datasets[1].data.pop();
      memChart.data.datasets[2].data.pop();

      cpuChart.data.datasets[0].data.pop();
      delayChart.data.datasets[0].data.pop();
    }

    memChart.update(0);
    cpuChart.update(0);
    delayChart.update(0);
  }

  resetCharts();

  // holds the flowlist and editor
  const flowEditorHolder = document.getElementById('flowEditorHolder');

  // zoom and reset
  function zoomOut() {
    if (xibleEditor.zoom < 0.2) {
      return;
    }

    xibleEditor.zoom = (Math.round(xibleEditor.zoom * 10) - 1) / 10;
    xibleEditor.transform();
  }
  document.getElementById('zoomOutButton').onclick = zoomOut;
  function zoomReset() {
    xibleEditor.zoom = 1;
    xibleEditor.transform();
  }
  document.getElementById('zoomResetButton').onclick = zoomReset;
  function zoomIn() {
    if (xibleEditor.zoom >= 5) {
      return;
    }

    xibleEditor.zoom = (Math.round(xibleEditor.zoom * 10) + 1) / 10;
    xibleEditor.transform();
  }
  document.getElementById('zoomInButton').onclick = zoomIn;
  function zoomFit() {
    if (!xibleEditor.loadedFlow || !xibleEditor.loadedFlow.nodes.length) {
      return;
    }

    // get the min/max coordinates from the nodes
    let minLeft;
    let minTop;
    let maxLeft;
    let maxTop;
    for (let i = 0; i < xibleEditor.loadedFlow.nodes.length; i += 1) {
      const node = xibleEditor.loadedFlow.nodes[i];
      const nodeOffsetWidth = node.element.offsetWidth;
      const nodeOffsetHeight = node.element.offsetHeight;

      if (!minLeft || node.left < minLeft) {
        minLeft = node.left;
      }
      if (!maxLeft || node.left + nodeOffsetWidth > maxLeft) {
        maxLeft = node.left + nodeOffsetWidth;
      }
      if (!minTop || node.top < minTop) {
        minTop = node.top;
      }
      if (!maxTop || node.top + nodeOffsetHeight > maxTop) {
        maxTop = node.top + nodeOffsetHeight;
      }
    }

    // get editor size
    const xibleEditorBounding = xibleEditor.element.getBoundingClientRect();
    const xibleEditorWidth = xibleEditorBounding.width;
    const xibleEditorHeight = xibleEditorBounding.height;

    // add some padding to the found node coordinates;
    const PADDING = 40;
    minLeft -= PADDING;
    maxLeft += PADDING;
    minTop -= PADDING;
    maxTop += PADDING;

    // calculate the zoom factor and zoom to the lowest factor
    const widthZoomFactor = xibleEditorWidth / (maxLeft - minLeft);
    const heightZoomFactor = xibleEditorHeight / (maxTop - minTop);
    xibleEditor.zoom = Math.min(widthZoomFactor, heightZoomFactor);

    // set left and top properties for the editor
    if (widthZoomFactor < heightZoomFactor) {
      // set x
      xibleEditor.left = xibleEditor.zoom * -minLeft;

      // center y
      xibleEditor.top = (xibleEditor.zoom * -minTop) + (xibleEditorHeight / 2) -
        (xibleEditor.zoom * ((maxTop - minTop) / 2));
    } else {
      // center x
      xibleEditor.left = (xibleEditor.zoom * -minLeft) + (xibleEditorWidth / 2) -
        (xibleEditor.zoom * ((maxLeft - minLeft) / 2));

      // set y
      xibleEditor.top = xibleEditor.zoom * -minTop;
    }

    // apply the transormation
    xibleEditor.transform();
  }
  document.getElementById('zoomFitButton').onclick = zoomFit;

  // add the flow names to the flow tab list
  const flowListUl = document.getElementById('flowList');

  // disable some buttons when this flow is notRunnable
  function setLoadedFlowState(flow) {
    if (flow !== xibleEditor.loadedFlow) {
      return;
    }

    if (xibleEditor.browserSupport) {
      document.getElementById('xibleFlowSaveButton').disabled = false;
    }

    document.getElementById('xibleFlowDeleteButton').disabled = false;

    if (!flow.runnable) {
      document.getElementById('flowNotRunnable').classList.remove('hidden');
      document.getElementById('xibleFlowStartButton').disabled = true;
      document.getElementById('xibleFlowStopButton').disabled = true;
      document.getElementById('xibleFlowDeployButton').disabled = true;
    } else {
      document.getElementById('flowNotRunnable').classList.add('hidden');
      document.getElementById('xibleFlowStartButton').disabled = false;
      document.getElementById('xibleFlowStopButton').disabled = false;
      if (xibleEditor.browserSupport) {
        document.getElementById('xibleFlowDeployButton').disabled = false;
      }
    }
  }

  async function setFlowTabState(flow, li) {
    li.classList.remove('notRunnable', 'initializing', 'initialized', 'started', 'starting', 'stopped', 'stopping', 'direct');

    if (!flow.runnable) {
      li.classList.add('notRunnable');
    }

    if (flow.directed) {
      li.classList.add('direct');
    }

    try {
      const instances = await flow.getInstances();
      const stateUl = li.querySelector('ul.states');
      stateUl.innerHTML = '';
      instances.forEach((instance) => {
        const stateLi = stateUl.appendChild(document.createElement('li'));
        stateLi.classList.add(`state-${instance.state}`);
        if (instance.directed) {
          stateLi.classList.add('directed');
        }
      });

      const instanceCountEl = li.querySelector('.instance-count');
      instanceCountEl.innerHTML = instances.length;
    } catch (err) {
      console.error(err);
    }

    setLoadedFlowState(flow);
  }

  function createFlowTab(flow, newFlow) {
    const li = flowListUl.appendChild(document.createElement('li'));
    li.setAttribute('data-flowId', flow._id);
    const a = li.appendChild(document.createElement('a'));
    li.appendChild(document.createElement('div')).classList.add('instance-count');
    const stateUl = a.appendChild(document.createElement('ul'));
    stateUl.classList.add('states');
    a.appendChild(document.createTextNode(flow._id));
    a.setAttribute('title', flow._id);
    a.onclick = () => {
      mainViewHolder.navigate(`/editor/${flow._id}`, true);

      resetCharts();
      logUl.innerHTML = '';

      Array.from(flowListUl.querySelectorAll('li.open'))
      .forEach((openLi) => {
        openLi.classList.remove('open');
      });
      li.classList.add('open');

      if (!xibleEditor.viewFlow(flow)) {
        return;
      }

      setLoadedFlowState(flow);

      // get all persistent websocket messages
      xibleWrapper.getPersistentWebSocketMessages()
      .then((messages) => {
        let flowInstanceId;
        let nodeId;
        let statusId;
        for (flowInstanceId in messages) {
          for (nodeId in messages[flowInstanceId]) {
            for (statusId in messages[flowInstanceId][nodeId]) {
              xibleEditor.messageHandler(messages[flowInstanceId][nodeId][statusId]);
            }
          }
        }
      });

      // set desired zoomstate
      xibleWrapper.Config.getValue('editor.viewstate.zoomstateonopen')
      .then((value) => {
        switch (value) {
          case 'reset':
            zoomReset();
            break;
          case 'fit':
            zoomFit();
            break;
        }
      });
    };

    // if in path, load it immediately
    const pathSplit = window.location.pathname.split('/');
    if (pathSplit.length > 1 && pathSplit[2] === encodeURIComponent(flow._id)) {
      a.click();
    }

    function flowOnInitJson() {
      setFlowTabState(flow, li);
    }
    flow.on('initJson', flowOnInitJson);

    if (!newFlow) {
      setFlowTabState(flow, li);

      flow.getInstances()
      .then((instances) => {
        instances.forEach(instance => handleInstanceState(instance, flow, li));
      })
      .catch((err) => {
        console.error(err);
      });
    }

    function flowOnCreateInstance({ flowInstance }) {
      setFlowTabState(flow, li);

      handleInstanceState(flowInstance, flow, li);
    }
    flow.on('createInstance', flowOnCreateInstance);

    function flowOnDeleteInstance() {
      setFlowTabState(flow, li);
    }
    flow.on('deleteInstance', flowOnDeleteInstance);

    mainViewHolder.once('purge', () => {
      flow.removeListener('initJson', flowOnInitJson);
      flow.removeListener('createInstance', flowOnCreateInstance);
      flow.removeListener('deleteInstance', flowOnDeleteInstance);
    });

    return li;
  }

  function handleInstanceState(instance, flow, li) {
    function flowInstanceOnStateChange() {
      setFlowTabState(flow, li);
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
  }

  // create button to add new flows
  const li = flowListUl.appendChild(document.createElement('li'));
  li.classList.add('add');
  const a = li.appendChild(document.createElement('a'));
  a.setAttribute('title', 'Add a flow');
  a.appendChild(document.createTextNode('+'));
  a.onclick = () => {
    const addFlowPrompt = customPrompt(`
      <section>
        <h1>Flow details</h1>
        <dl>
          <dt>
            <label for="newFlowName">
              Flow name
              <div>
                This may not start with an underscore (_) and the following characters are prohibited: /\\:?&lt;&gt;&quot;&apos;
              </div>
            </label>
          </dt>
          <dd>
            <input type="text" id="newFlowName" required="required" pattern="^[^_/\\\\:?&lt;&gt;&quot;&apos;][^/\\\\:?&lt;&gt;&quot;&apos;]+$" />
          </dd>
        </dl>
      </section>
    `);

    addFlowPrompt.form.addEventListener('submit', async () => {
      const flowName = document.getElementById('newFlowName').value;
      addFlowPrompt.remove();

      resetCharts();

      Array.from(document.querySelectorAll('.flowList>li.open'))
      .forEach((openLi) => {
        openLi.classList.remove('open');
      });

      const flow = new XibleEditorFlow({
        _id: flowName
      });
      const flowTab = createFlowTab(flow, true);
      flowTab.classList.add('open', 'loading');
      flowTab.firstChild.click();

      try {
        await flow.save(true);

        xibleEditor.flows[flow._id] = flow;

        flowTab.addEventListener('animationiteration', () => {
          flowTab.classList.remove('loading');
        }, {
          once: true
        });
      } catch (err) {
        // TODO: give feedback about what went wrong
        console.error(err);

        flowTab.classList.add('notRunnable');

        setTimeout(() => {
          flowTab.addEventListener('animationiteration', () => {
            flowListUl.removeChild(flowTab);
          }, {
            once: true
          });
        }, 2000);
      }
    });
  };

  // get all flows and add them
  function loadFlows() {
    flowListUl.classList.add('loading');

    // ensure all flow tabs are gone
    Array.from(flowListUl.parentNode.querySelectorAll('#flowList > li:not(.add)'))
    .forEach((flowListLi) => {
      flowListUl.removeChild(flowListLi);
    });

    xibleEditor.getFlows()
    .then((flows) => {
      Object.keys(flows).forEach((id) => {
        createFlowTab(flows[id]);
      });

      flowListUl.addEventListener('animationiteration', () => {
        flowListUl.classList.remove('loading');
      }, {
        once: true
      });
    });
  }

  // add the xibleEditor to the view
  flowEditorHolder.appendChild(xibleEditor.element);

  // socket connection
  function xibleWrapperOnOpen() {
    // reload the flows
    loadFlows();

    // reload the nodes
    xibleEditor.nodeSelector.fill();
  }

  if (xibleWrapper.readyState === XibleWrapper.STATE_OPEN) {
    xibleWrapperOnOpen();
  }

  xibleWrapper.on('open', xibleWrapperOnOpen);

  // clear all flow statuses when connection closes
  function xibleWrapperOnClose() {
    // remove state li's
    Array.from(flowListUl.querySelectorAll('ul.states li'))
    .forEach((li) => {
      li.parentNode.removeChild(li);
    });

    // reset instance counts
    Array.from(flowListUl.querySelectorAll('.instance-count'))
    .forEach((instanceCountEl) => {
      instanceCountEl.innerHTML = '0';
    });

    // reset directed styling
    if (xibleEditor.loadedFlow && xibleEditor.loadedFlow.directedInstance) {
      xibleEditor.loadedFlow.undirect();
    }
  }
  xibleWrapper.on('close', xibleWrapperOnClose);

  // cleanup when view is purged
  mainViewHolder.once('purge', () => {
    xibleWrapper.removeListener('open', xibleWrapperOnOpen);
    xibleWrapper.removeListener('close', xibleWrapperOnClose);
  });
}

View.routes['/editor'] = editorView;
View.routes['/editor/:flowName'] = editorView;
