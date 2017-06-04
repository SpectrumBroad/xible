'use strict';

module.exports = (NODE) => {
  const triggerIn = NODE.getInputByName('trigger');
  const doneOut = NODE.getOutputByName('done');

  const stack = [];

  triggerIn.on('trigger', (conn, state) => {
    // figure out where this trigger belongs on the stack;
    let thisStack;
    if (!stack.length) {
      stack.push(thisStack = []);
    } else {
      thisStack = stack.find(s => !s.includes(conn));
      if (!thisStack) {
        stack.push(thisStack = []);
      }
    }

    if (!thisStack.length) {
      thisStack.statusId = NODE.addProgressBar({
        percentage: 1 / triggerIn.connectors.length * 100
      });
    } else {
      NODE.updateProgressBarById(thisStack.statusId, {
        percentage: (thisStack.length + 1) / triggerIn.connectors.length * 100
      });
    }

    thisStack.push(conn);

    if (triggerIn.connectors.length === thisStack.length) {
      stack.shift();
      NODE.removeStatusById(thisStack.statusId, 700);
      doneOut.trigger(state);
    }
  });
};
