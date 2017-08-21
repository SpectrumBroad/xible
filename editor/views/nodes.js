'use strict';

View.routes['/nodes'] = (EL) => {
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
    <div class="inner"><h1></h1></div>
  `;
};
