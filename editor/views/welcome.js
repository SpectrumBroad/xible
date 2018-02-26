'use strict';

View.routes['/welcome'] = (EL) => {
  EL.innerHTML = `
    <div id="sub">
      <header>XIBLE</header>
      <p id="connectionLost" class="status loading alert hidden">
        Connection lost
      </p>
    </div>
    <div class="inner">
      <section>
        <h1>Welcome</h1>
        <p>Welcome to your Xible installation.</p>
      </section>
    </div>
  `;
};
