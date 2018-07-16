'use strict';

const assert = require('assert');

function containsItem(arr, thisVal) {
  return !!arr.find((val) => {
    try {
      assert.deepEqual(thisVal, val);
      return true;
    } catch (err) {
      return false;
    }
  });
}

function filterValues(values, duplicates = false) {
  const filtered = [];

  for (let i = 0; i < values.length; i += 1) {
    const copy = values.slice();
    const thisVal = copy.splice(i, 1)[0];

    if (duplicates === containsItem(copy, thisVal) && !containsItem(filtered, thisVal)) {
      filtered.push(thisVal);
    }
  }

  return filtered;
}

module.exports = (NODE) => {
  const valuesIn = NODE.getInputByName('values');
  const filteredOut = NODE.getOutputByName('filtered');
  filteredOut.on('trigger', async (conn, state) => {
    const values = await valuesIn.getValues(state);
    return filterValues(values);
  });

  const duplicatesOut = NODE.getOutputByName('duplicates');
  duplicatesOut.on('trigger', async (conn, state) => {
    const values = await valuesIn.getValues(state);
    return filterValues(values, true);
  });
};
