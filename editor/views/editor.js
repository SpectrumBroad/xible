'use strict';

function editorView(EL) {
  EL.classList.add('editor');

  EL.innerHTML = `
    <div class="top">
      <header>XIBLE<!--<span>ENTERPRISE</span>--></header>
      <ul id="flowList" class="flowList loading"></ul>
    </div>
    <div id="bottomDiv" class="bottom">
      <div id="sub">
        <div class="interactions">
          <div class="dockSide">
            Dock side
            <ul>
              <li>
                <button id="dockSideLeftButton">
                  <svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M2 4H22V20H2V4ZM8 6H20V18H8V6Z"/>
                  </svg>
                </button>
              </li>
              <li>
                <button id="dockSideBottomButton">
                  <svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M2 20V4H22V20H2ZM4 6H20V14H4V6Z"/>
                  </svg>
                </button>
              </li>
            </ul>
          </div>
          <p id="connectionLost" class="status loading alert hidden">
            Connection lost
          </p>
          <p id="validateWritePermissions" class="status loading">
            Validating write permissions
          </p>
          <p id="browserSupportAttachShadow" class="status alert hidden">
            Your browser does not support the necessary features to enable all editor functionality.
            <a href="#">Details</a>
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
        </div>
        <div class="results">
          <ul class="tablist">
            <li class="open">
              <a id="logOpenA" href="#logs" data-section-class="log">log</a>
            </li>
            <li>
              <a id="statsOpenA" href="#resources" data-section-class="stats">resources</a>
            </li>
            <li style="display: none;">
              <a id="instancesOpenA" href="#instances" data-section-class="instances">instances</a>
            </li>
          </ul>
          <section id="log" class="tabcontents log">
            <form class="buttons">
              <button id="logClearButton" type="button">clear</button>
              <!-- <label class="required"><input type="checkbox" value="true" />wrap<span></span></label> -->
            </form>
            <ul></ul>
          </section>
          <section class="tabcontents stats" style="display: none;">
            <div class="chart">
              <div class="chartHolder">
                <canvas id="cpuChart"></canvas>
              </div>
              <div class="labels">
                <label id="cpu">cpu</label>
              </div>
            </div>
            <div class="chart">
              <div class="chartHolder">
                <canvas id="memChart"></canvas>
              </div>
              <div class="labels">
                <label id="rss">rss</label>
                <label id="heapTotal">heap total</label>
                <label id="heapUsed">heap used</label>
              </div>
            </div>
            <div class="chart">
              <div class="chartHolder">
                <canvas id="delayChart"></canvas>
              </div>
              <div class="labels">
                <label id="delay">event loop delay</label>
              </div>
            </div>
          </section>
          <section id="instances" class="tabcontents instances" style="display: none;">
            <ul></ul>
          </section>
        </div>
      </div>
      <div id="flowEditorHolder">
        <div id="snapConfiguration">
          <label title="Snaps the nodes to a grid upon dragging them">
            <input type="checkbox" checked id="snapConfigurationCheckbox" />
            <span></span>
            Snap
          </label>
        </div>
        <div class="zoomButtons">
          <button id="zoomOutButton" type="button" title="Zoom out">&#xe024;</button>
          <button id="zoomFitButton" type="button" title="Zoom to fit">&gt;</button>
          <button id="zoomResetButton" type="button" title="Reset zoom">&#xe01c;</button>
          <button id="zoomInButton" type="button" title="Zoom in">&#xe035;</button>
        </div>
      </div>
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

    browserSupportAttachShadowEl.querySelector('a').addEventListener('click', (event) => {
      event.preventDefault();

      const detailPrompt = customPrompt(`
        <h1>Browser support</h1>
        <p class="warning">
          The XIBLE editor requires several browser features which have not landed in every major browser yet.
        </p>
        <section id="browserSupportDetails">
          <h2>Details</h2>
          <dl>
            <dt>
              <label>
                Shadow DOM v1
                <div>
                  Method of establishing and maintaining functional boundaries between DOM trees and how these trees interact with each other within a document, thus enabling better functional encapsulation within the DOM & CSS.
                  <a href="https://caniuse.com/#feat=shadowdomv1" target="_blank" rel="noopener">caniuse.com</a>
                </div>
              </label>
            </dt>
            <dd id="browserSupport_attachShadow">
            </dd>

            <dt>
              <label>
                HTML templates
                <div>
                  Method of declaring a portion of reusable markup that is parsed but not rendered until cloned.
                  <a href="https://caniuse.com/#feat=template" target="_blank" rel="noopener">caniuse.com</a>
                </div>
              </label>
            </dt>
            <dd id="browserSupport_templateElement">
            </dd>

            <dt>
              <label>
                HTML imports
                <div>
                  Method of including and reusing HTML documents in other HTML documents.
                  <a href="https://caniuse.com/#feat=imports" target="_blank" rel="noopener">caniuse.com</a>
                </div>
              </label>
            </dt>
            <dd id="browserSupport_linkImport">
            </dd>

            <dt>
              <label>
                JavaScript modules via script tag
                <div>
                  Loading JavaScript module scripts using &lt;script type=&quot;module&quot;&gt;
                  <a href="https://caniuse.com/#feat=es6-module" target="_blank" rel="noopener">caniuse.com</a>
                </div>
              </label>
            </dt>
            <dd id="browserSupport_scriptModule">
            </dd>
          </dl>
        </section>
        <button type="button">Close</button>
      `, true);

      for (const browserSupportItem in xibleEditor.browserSupportItems) {
        const supported = xibleEditor.browserSupportItems[browserSupportItem];
        const ddEl = detailPrompt.form.querySelector(`#browserSupport_${browserSupportItem}`);
        ddEl.appendChild(document.createTextNode(supported ? 'Supported' : 'Not supported'));

        if (!supported) {
          ddEl.classList.add('error');
        }
      }

      detailPrompt.form.querySelector('button').addEventListener('click', () => {
        detailPrompt.remove();
      });
    });

    // disable buttons that require input from content in the browser
    document.getElementById('xibleFlowDeployButton').disabled = true;
    document.getElementById('xibleFlowSaveButton').disabled = true;
  }

  // Dock-side
  const bottomDiv = document.getElementById('bottomDiv');
  const dockSideLeftButton = document.getElementById('dockSideLeftButton');
  dockSideLeftButton.onclick = () => {
    localStorage.setItem('dockSide', 'left');
    bottomDiv.classList.remove('column');
  };
  const dockSideBottomButton = document.getElementById('dockSideBottomButton');
  dockSideBottomButton.onclick = () => {
    localStorage.setItem('dockSide', 'bottom');
    bottomDiv.classList.add('column');
  };

  if (localStorage.getItem('dockSide') === 'bottom') {
    bottomDiv.classList.add('column');
  }

  // flip between logs and stats
  const logOpenEl = document.getElementById('logOpenA');
  const statsOpenEl = document.getElementById('statsOpenA');
  const instancesOpenEl = document.getElementById('instancesOpenA');
  const logUl = document.querySelector('#log ul');
  const instancesUl = document.querySelector('#instances ul');

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
  instancesOpenEl.addEventListener('click', switchSubTab);

  // clear log button
  const logClearButton = document.getElementById('logClearButton');
  logClearButton.onclick = () => {
    logUl.innerHTML = '';
  };

  // hook buttons
  // deploy
  document.getElementById('xibleFlowDeployButton').onclick = () => deployFlow(xibleEditor.loadedFlow);

  // start
  document.getElementById('xibleFlowStartButton').onclick = () => startFlow(xibleEditor.loadedFlow);

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
  document.getElementById('xibleFlowDeleteButton').onclick = () => deleteFlow(xibleEditor.loadedFlow);

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
    xibleEditor.destroy();
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

  // snap
  const snapConfigurationCheckbox = document.getElementById('snapConfigurationCheckbox');
  snapConfigurationCheckbox.onchange = () => {
    xibleEditor.gridSize = snapConfigurationCheckbox.checked ? 50 : 0;
  };

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

      if (minLeft === undefined || node.left < minLeft) {
        minLeft = node.left;
      }
      if (maxLeft === undefined || node.left + nodeOffsetWidth > maxLeft) {
        maxLeft = node.left + nodeOffsetWidth;
      }
      if (minTop === undefined || node.top < minTop) {
        minTop = node.top;
      }
      if (maxTop === undefined || node.top + nodeOffsetHeight > maxTop) {
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
      xibleEditor.top = (xibleEditor.zoom * -minTop) + (xibleEditorHeight / 2)
        - (xibleEditor.zoom * ((maxTop - minTop) / 2));
    } else {
      // center x
      xibleEditor.left = (xibleEditor.zoom * -minLeft) + (xibleEditorWidth / 2)
        - (xibleEditor.zoom * ((maxLeft - minLeft) / 2));

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

  async function fillInstances(flow) {
    instancesUl.innerHTML = '';
    const instances = await flow.getInstances();
    instances.forEach((instance) => createInstance(instance));
  }

  function createInstance(instance) {
    const instanceLi = instancesUl.appendChild(document.createElement('li'));
    const paramsTextarea = instanceLi.appendChild(document.createElement('textarea'));
    paramsTextarea.disabled = true;
    paramsTextarea.appendChild(document.createTextNode(JSON.stringify(instance.params, null, '  ')));
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

      // fillInstances(flow);

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
          instances.forEach((instance) => handleInstanceState(instance, flow, li));
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

    function flowOnDelete() {
      const flowTab = document.querySelector(`.flowList>li[data-flowid="${flow._id}"]`);
      if (flowTab) {
        flowTab.parentNode.removeChild(flowTab);
      }
    }
    flow.on('delete', flowOnDelete);

    mainViewHolder.once('purge', () => {
      flow.removeListener('initJson', flowOnInitJson);
      flow.removeListener('createInstance', flowOnCreateInstance);
      flow.removeListener('deleteInstance', flowOnDeleteInstance);
      flow.removeListener('delete', flowOnDelete);
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
            <input type="text" id="newFlowName" required="required" pattern="^[^_\\/\\\\:?&lt;&gt;&quot;&apos;][^\\/\\\\:?&lt;&gt;&quot;&apos;]+$" />
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
