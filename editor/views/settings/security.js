'use strict';

View.routes['/settings/security'] = (EL) => {
  EL.innerHTML = `
    <section>
      <h1>Users</h1>

      <section id="users">
        <h2>Users</h2>
        <table>
        </table>
      </section>
    </section>
  `;
};
