'use strict';

View.routes['/settings'] = (EL) => {
  EL.innerHTML = `
    <div id="sub">
      <header>XIBLE</header>
      <p id="connectionLost" class="status loading alert hidden">
        Connection lost
      </p>
      <p id="validateWritePermissions" class="status loading">Validating write permissions</p>
      <section>
        <h1>General</h1>
        <ul>
          <li><a href="/settings/general#webserver" onclick="settingsViewHolder.navigate('/settings/general#webserver'); return false;">Webserver</a></li>
          <li><a href="/settings/general#nodes" onclick="settingsViewHolder.navigate('/settings/general#nodes'); return false;">Nodes</a></li>
          <li><a href="/settings/general#flows" onclick="settingsViewHolder.navigate('/settings/general#flows'); return false;">Flows</a></li>
          <li><a href="/settings/general#vault" onclick="settingsViewHolder.navigate('/settings/general#vault'); return false;">Vault</a></li>
        </ul>
      </section>
      <section>
        <h1>Editor</h1>
        <ul>
          <li><a href="/settings/editor#settings" onclick="settingsViewHolder.navigate('/settings/editor#settings'); return false;">Settings</a></li>
          <li><a href="/settings/editor#nodes" onclick="settingsViewHolder.navigate('/settings/editor#nodes'); return false;">Nodes</a></li>
          <li><a href="/settings/editor#flows" onclick="settingsViewHolder.navigate('/settings/editor#flows'); return false;">Flows</a></li>
          <li><a href="/settings/editor#viewstate" onclick="settingsViewHolder.navigate('/settings/editor#viewstate'); return false;">Viewstate</a></li>
        </ul>
      </section>
      <!--
      <section>
        <h1>Security</h1>
        <ul>
          <li><a href="/settings/security#users">Users</a></li>
          <li><a href="#">Groups</a></li>
          <li><a href="#">Permissions</a></li>
          <li><a href="/settings/security#tokens">Tokens</a></li>
        </ul>
      </section>
      -->
      <section>
        <h1>Registry</h1>
        <ul>
          <li><a href="/settings/registry#general" onclick="settingsViewHolder.navigate('/settings/registry#general'); return false;">General</a></li>
          <li><a href="/settings/registry#nodepacks" onclick="settingsViewHolder.navigate('/settings/registry#nodepacks'); return false;">Nodepacks</a></li>
          <li><a href="/settings/registry#flows" onclick="settingsViewHolder.navigate('/settings/registry#flows'); return false;">Flows</a></li>
        </ul>
      </section>
    </div>
    <div class="inner" id="settingsContent"></div>
  `;

  const settingsViewHolder = new ViewHolder(document.getElementById('settingsContent'), '/settings');
  window.settingsViewHolder = settingsViewHolder;
  settingsViewHolder.on('load', (view) => {
    // unselect all buttons from #sub
    Array.from(document.querySelectorAll('#sub ul a'))
      .forEach((a) => a.classList.remove('view'));

    // select the button from lhs
    const a = document.querySelector(`#sub ul a[href*="${window.location.hash}"][href*="${view.name}"]`);
    if (a) {
      a.classList.add('view');
    }

    // hook event handler on change to save config data immediately
    Array.from(document.querySelectorAll('input[data-configpath], select[data-configpath]'))
      .forEach((input) => {
        input.addEventListener('change', () => {
          let { value } = input;
          switch (input.getAttribute('type')) {
            case 'number':

              if (typeof value === 'string' && value.length > 0) {
                value = +value;
                if (isNaN(value)) {
                  return;
                }
              }

              break;

            case 'checkbox':
              value = input.checked;
              break;
          }

          if (typeof value === 'string' && value.length === 0) {
            xibleWrapper.Config.deleteValue(input.getAttribute('data-configpath'));
            return;
          }

          xibleWrapper.Config.setValue(input.getAttribute('data-configpath'), value);
        });
      });

    // disable if necessary
    xibleWrapper.Config.getValue('editor.settings.allowchange')
      .then((allowChange) => {
        Array.from(document.querySelectorAll('input[data-configpath], select[data-configpath]'))
          .forEach((input) => {
            input.disabled = !allowChange;
          });
      });

    // set the right data in the data-configpath fields
    xibleWrapper.Config.getAll()
      .then((config) => {
        Array.from(document.querySelectorAll('input[data-configpath], select[data-configpath]'))
          .forEach((input) => {
            if (input.getAttribute('type') === 'checkbox') {
              input.checked = !!xibleWrapper.Config.getObjectValueOnPath(config, input.getAttribute('data-configpath'));
            } else {
              input.value = xibleWrapper.Config.getObjectValueOnPath(config, input.getAttribute('data-configpath'));
            }
          });
      });
  });
  settingsViewHolder.hookNavHandler();
  settingsViewHolder.loadNav()
    .catch(() => {
      mainViewHolder.navigate('/settings/general');
    });

  // validate if the config can be altered
  const permissionsValidate = document.getElementById('validateWritePermissions');
  xibleWrapper.Config.validatePermissions()
    .then((result) => {
      permissionsValidate.addEventListener('animationiteration', () => {
        permissionsValidate.classList.remove('loading');
      }, {
        once: true
      });

      if (result) {
        permissionsValidate.innerHTML = 'Write permissions check success.';
        permissionsValidate.classList.remove('checking');
        permissionsValidate.classList.add('success');

        window.setTimeout(() => {
          permissionsValidate.parentNode.removeChild(permissionsValidate);
        }, 6000);
      } else {
        permissionsValidate.innerHTML = 'Writing to the configuration file failed. Please check permissions.';
        permissionsValidate.classList.remove('checking', 'loading');
        permissionsValidate.classList.add('alert');
      }
    });
};
