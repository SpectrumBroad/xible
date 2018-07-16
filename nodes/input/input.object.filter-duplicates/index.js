'use strict';

const assert = require('assert');

function containsItem(arr, thisVal, key) {
  return !!arr.find((val) => {
    let compareThisVal = thisVal;
    let compareVal = val;

    if (key) {
      compareThisVal = thisVal[key];
      compareVal = val[key];
    }

    try {
      assert.deepEqual(compareThisVal, compareVal);
      return true;
    } catch (err) {
      return false;
    }
  });
}

function filterValues(values, key, duplicates = false) {
  const filtered = [];

  for (let i = 0; i < values.length; i += 1) {
    const copy = values.slice();
    const thisVal = copy.splice(i, 1)[0];

    if (duplicates === containsItem(copy, thisVal, key) && !containsItem(filtered, thisVal)) {
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
    return filterValues(values, NODE.data.key);
  });

  const duplicatesOut = NODE.getOutputByName('duplicates');
  duplicatesOut.on('trigger', async (conn, state) => {
    const values = await valuesIn.getValues(state);
    return filterValues(values, NODE.data.key, true);
  });
};
