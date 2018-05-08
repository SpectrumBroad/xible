'use strict';

function customPrompt(fragment, noAuto) {
  const container = document.createElement('div');
  container.classList.add('prompt');

  const remove = () => {
    document.body.removeEventListener('keyup', escapeKeyListener);
    document.body.removeChild(container);
  };

  const escapeKeyListener = (event) => {
    if (event.keyCode === 27) {
      remove();
    }
  };

  document.body.addEventListener('keyup', escapeKeyListener);

  const form = container.appendChild(document.createElement('form'));
  if (typeof fragment === 'string') {
    form.innerHTML = fragment;
  } else {
    form.appendChild(fragment);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  if (!noAuto || typeof noAuto === 'string') {
    const submitButton = form.appendChild(document.createElement('input'));
    submitButton.setAttribute('type', 'submit');
    submitButton.value = noAuto || 'Submit';

    const cancelButton = form.appendChild(document.createElement('input'));
    cancelButton.setAttribute('type', 'button');
    cancelButton.value = 'Cancel';
    cancelButton.addEventListener('click', remove);
  }
  document.body.appendChild(container);

  // auto focus first input element
  const firstInput = container.querySelector('input, select');
  if (firstInput) {
    firstInput.focus();
  }

  return { container, form, remove };
}
