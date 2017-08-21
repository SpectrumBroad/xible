'use strict';

View.routes['/welcome'] = (EL) => {
  EL.innerHTML = `
    <div id="sub">
      <header>XIBLE</header>
    </div>
    <div class="inner">
      <section>
        <h1>Welcome</h1>
        <p>Welcome to your Xible installation.</p>
      </section>
    </div>
  `;
};
