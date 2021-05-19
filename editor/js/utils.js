'use strict';

const htmlMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;'
};

function escapeHtml(str) {
  if (!str) {
    return '';
  }

  return str.replace(/[&<>"]/g, (tag) => htmlMap[tag] || tag);
}

function getParamNames(flow) {
  const paramNodes = flow.getNodesByName('xible.flow.instance.param');
  return paramNodes.map((paramNode) => paramNode.data.paramName)
    .filter((paramName) => !!paramName);
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

async function flowHasRunningInstances(flow) {
  if (!flow) {
    throw new Error('The "flow" argument needs to be specified');
  }

  const instances = await flow.getInstances();
  return instances.some(
    (instance) => instance.state !== xibleWrapper.FlowInstance.STATE_STOPPED
      && instance.state !== xibleWrapper.FlowInstance.STATE_STOPPING
      && instance.state !== xibleWrapper.FlowInstance.STATE_INITIALIZED
  );
}

async function deployFlow(flow) {
  // get parameter names
  const paramNames = getParamNames(flow);

  // if there are no parameters and there are no instances running
  // simply deploy immediately.
  const hasInstancesRunning = await flowHasRunningInstances(flow);
  if (!paramNames.length && !hasInstancesRunning) {
    flow = await flow.save();
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

    flow = await flow.save();
    await flow.createInstance({ start: true, params });
  });
}

async function startFlow(flow) {
  // get parameter names
  const paramNames = getParamNames(flow);

  // if there are no parameters and there are no instances running
  // simply start immediately.
  const hasInstancesRunning = await flowHasRunningInstances(flow);
  if (!paramNames.length && !hasInstancesRunning) {
    flow.createInstance({ start: true });
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
        await flow.stopAllInstances();
      }
    }

    startPrompt.remove();
    flow.createInstance({ start: true, params });
  });
}

function deleteFlow(flow) {
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
}

function publishFlow(flow) {
  const publishPrompt = customPrompt(`
    <h1>Publish flow</h1>
    <p>
      You are about to publish flow &quot;<span style="font-weight: bold;"></span>&quot;.
      Any information contained within your vault will not be published.
    </p>
    <section>
      <h2>Publish information</h2>
      <dl>
        <dt>
          <label>
            Published name
            <div>
              You can specify the name of the flow when published here.
            </div>
          </label>
        </dt>
        <dd>
          <input type="text" id="publishFlowAltName" />
        </dd>
      </dl>
    </section>
  `, 'Confirm');

  publishPrompt.form.querySelector('span').appendChild(document.createTextNode(flow._id));
  const publishFlowAltNameInput = document.getElementById('publishFlowAltName');
  publishFlowAltNameInput.value = flow._id;

  publishPrompt.form.addEventListener('submit', async () => {
    const submitButton = publishPrompt.form.querySelector('button[type=submit]');
    submitButton.classList.add('loading');
    submitButton.disabled = true;

    try {
      await flow.publish(publishFlowAltNameInput.value || undefined);

      publishPrompt.remove();
    } catch (err) {
      publishPrompt.errors.add(err);
    }
  });
}
