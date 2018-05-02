'use strict';

function editorView(EL) {
  const CHART_MAX_TICKS = 60;

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
      <section class="stats">
        <div>
          <canvas id="cpuChart"></canvas>
        </div>
        <label id="cpu">cpu</label>
      </section>
      <section class="stats">
        <div>
          <canvas id="memChart"></canvas>
        </div>
        <label id="rss">rss</label>
        <label id="heapTotal">heap total</label>
        <label id="heapUsed">heap used</label>
      </section>
      <section class="stats">
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

  // hook buttons
  // deploy
  document.getElementById('xibleFlowDeployButton').onclick = async () => {
    const flow = await xibleEditor.loadedFlow.save();
    await flow.createInstance({ start: true });
  };

  // start
  document.getElementById('xibleFlowStartButton').onclick = () => {
    xibleEditor.loadedFlow.createInstance({ start: true });
  };

  // stop
  document.getElementById('xibleFlowStopButton').onclick = () => {
    xibleEditor.loadedFlow.stopAllInstances();
  };

  // save
  document.getElementById('xibleFlowSaveButton').onclick = () => {
    xibleEditor.loadedFlow.save();
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

  // cpu chart
  const cpuCanvas = document.getElementById('cpuChart');
  const cpuChart = new Chart(cpuCanvas, {
    type: 'line',
    data: {
      labels: new Array(CHART_MAX_TICKS),
      datasets: [
        {
          lineTension: 0,
          pointRadius: 0,
          backgroundColor: 'rgb(50, 167, 167)',
          borderColor: 'rgb(50, 167, 167)',
          borderWidth: 1,
          label: 'percentage',
          data: []
        }
      ]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,
      legend: {
        display: false
      },
      tooltips: {
        enabled: false
      },
      layout: {
        padding: 0
      },
      scales: {
        xAxes: [
          {
            display: false
          }
        ],
        yAxes: [
          {
            position: 'right',
            gridLines: {
              tickMarkLength: 5
            },
            ticks: {
              beginAtZero: true,
              padding: 2,
              fontColor: '#666',
              mirror: true,
              maxTicksLimit: 4,
              callback: value => `${value} %`
            }
          }
        ]
      }
    }
  });

  // memory chart
  const memCanvas = document.getElementById('memChart');
  const memChart = new Chart(memCanvas, {
    type: 'line',
    data: {
      labels: new Array(CHART_MAX_TICKS),
      datasets: [
        {
          lineTension: 0,
          pointRadius: 0,
          borderColor: 'rgb(230, 74, 107)',
          backgroundColor: 'rgb(230, 74, 107)',
          borderWidth: 1,
          label: 'heap used',
          data: []
        }, {
          lineTension: 0,
          pointRadius: 0,
          borderColor: 'rgb(29, 137, 210)',
          backgroundColor: 'rgb(29, 137, 210)',
          borderWidth: 1,
          label: 'heap total',
          data: []
        }, {
          lineTension: 0,
          pointRadius: 0,
          borderColor: 'rgb(230, 181, 61)',
          backgroundColor: 'rgb(230, 181, 61)',
          borderWidth: 1,
          label: 'rss',
          data: []
        }
      ]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,
      legend: {
        display: false
      },
      tooltips: {
        enabled: false
      },
      layout: {
        padding: 0
      },
      scales: {
        xAxes: [
          {
            display: false
          }
        ],
        yAxes: [
          {
            position: 'right',
            gridLines: {
              tickMarkLength: 5
            },
            ticks: {
              beginAtZero: true,
              padding: 2,
              fontColor: '#666',
              mirror: true,
              maxTicksLimit: 4,
              callback: value => `${value} MiB`
            }
          }
        ]
      }
    }
  });

  // delay chart
  const delayCanvas = document.getElementById('delayChart');
  const delayChart = new Chart(delayCanvas, {
    type: 'line',
    data: {
      labels: new Array(CHART_MAX_TICKS),
      datasets: [
        {
          lineTension: 0,
          pointRadius: 0,
          backgroundColor: 'purple',
          borderColor: 'purple',
          borderWidth: 1,
          label: 'nanoseconds',
          data: []
        }
      ]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,
      legend: {
        display: false
      },
      tooltips: {
        enabled: false
      },
      layout: {
        padding: 0
      },
      scales: {
        xAxes: [
          {
            display: false
          }
        ],
        yAxes: [
          {
            position: 'right',
            gridLines: {
              tickMarkLength: 5
            },
            ticks: {
              beginAtZero: true,
              padding: 2,
              fontColor: '#666',
              mirror: true,
              maxTicksLimit: 4,
              callback: value => `${value} μs`
            }
          }
        ]
      }
    }
  });

  // update the usage charts
  function onFlowUsage(usage) {
    if (!xibleEditor.loadedFlow || !usage) {
      return;
    }

    // only run this on the loaded flow
    const flow = usage[xibleEditor.loadedFlow._id];
    if (!flow) {
      return;
    }

    const combinedUsage = flow.reduce(
      (acc, currentValue, currentIndex) => {
        acc.cpu.user += currentValue.usage.cpu.user;
        acc.cpu.system += currentValue.usage.cpu.system;
        acc.cpu.percentage += currentValue.usage.cpu.percentage;

        acc.memory.rss += currentValue.usage.memory.rss;
        acc.memory.heapTotal += currentValue.usage.memory.heapTotal;
        acc.memory.heapUsed += currentValue.usage.memory.heapUsed;
        acc.memory.external += currentValue.usage.memory.external;

        if (!currentIndex) {
          acc.delay = currentValue.usage.delay;
        } else {
          acc.delay = ((acc.delay * currentIndex) + currentValue.usage.delay) / (currentIndex + 1);
        }

        return acc;
      },
      {
        cpu: {
          user: 0,
          system: 0,
          percentage: 0
        },
        memory: {
          rss: 0,
          heapTotal: 0,
          heapUsed: 0,
          external: 0
        },
        delay: 0
      }
    );

    while (memChart.data.datasets[0].data.length !== memChart.data.labels.length) {
      memChart.data.datasets[0].data.push(null);
      memChart.data.datasets[1].data.push(null);
      memChart.data.datasets[2].data.push(null);

      cpuChart.data.datasets[0].data.push(null);
      delayChart.data.datasets[0].data.push(null);
    }

    if (memChart.data.datasets[0].data.length === memChart.data.labels.length) {
      memChart.data.datasets[0].data.shift();
      memChart.data.datasets[1].data.shift();
      memChart.data.datasets[2].data.shift();

      cpuChart.data.datasets[0].data.shift();
      delayChart.data.datasets[0].data.shift();
    }

    memChart.data.datasets[2].data.push(Math.round(combinedUsage.memory.rss / 1024 / 1024));
    memChart.data.datasets[1].data.push(Math.round(combinedUsage.memory.heapTotal / 1024 / 1024));
    memChart.data.datasets[0].data.push(Math.round(combinedUsage.memory.heapUsed / 1024 / 1024));
    memChart.update(0);

    cpuChart.data.datasets[0].data.push(combinedUsage.cpu.percentage);
    cpuChart.update(0);

    delayChart.data.datasets[0].data.push(combinedUsage.delay);
    delayChart.update(0);
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

  let typeDefStyleEl = null;

  /**
  * Loads the style information (color) associated with typeDefs
  */
  function loadTypeDefStyles() {
    xibleWrapper.TypeDef.getAll()
    .then((typeDefs) => {
      // remove existing style el
      if (typeDefStyleEl && typeDefStyleEl.parentNode) {
        typeDefStyleEl.parentNode.removeChild(typeDefStyleEl);
      }

      // create new style el
      typeDefStyleEl = document.createElement('style');
      typeDefStyleEl.setAttribute('type', 'text/css');
      let styleText = '';
      for (const type in typeDefs) {
        if (typeDefs[type].color &&
          (
            /^\w+$/.test(typeDefs[type].color) ||
            /^#[a-f0-9]{6}$/i.test(typeDefs[type].color)
          )
        ) {
          styleText += `.xible .node>.io>ul>.${type.replace(/\./g, '\\.')} {border-color: ${typeDefs[type].color};}\n`;
        }
      }
      if (!styleText) {
        return;
      }

      // add to head
      typeDefStyleEl.appendChild(document.createTextNode(styleText));
      const head = document.head || document.getElementsByTagName('head')[0];
      head.appendChild(typeDefStyleEl);
    });
  }

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
    const flowName = window.prompt('Enter the flow name:');
    if (flowName.substring(0, 1) === '_') {
      window.alert('The flow name may not start with an underscore');
      return;
    } else if (/[/\\:?<>"]/.test(flowName)) {
      window.alert('The flow name may not contain any of the following characters: /\\:?<>');
      return;
    }

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

    flow.save(true)
    .then(() => {
      xibleEditor.flows[flow._id] = flow;

      flowTab.addEventListener('animationiteration', () => {
        flowTab.classList.remove('loading');
      }, {
        once: true
      });
    })
    .catch((err) => {
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

    // reload the typeDef styles
    loadTypeDefStyles();

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
