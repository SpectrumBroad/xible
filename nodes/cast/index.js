'use strict';

module.exports = (NODE) => {
  const valuesIn = NODE.getInputByName('values');
  const anyOut = NODE.getOutputByName('result');

  anyOut.on('trigger', async (conn, state) => {
    // get the input values
    const vals = await valuesIn.getValues(state)
    return vals.map((val) => {
      switch (NODE.data.castType) {
        case 'string':
          return `${val}`;

        case 'math.number':
          return +val;

        case 'boolean':
          return !!val;

        case 'date':
          return new Date(val);

        case 'time': {
          const d = new Date(val);
          d.setFullYear(0, 0, 1);
          return d;
        }

        default: // just in case
          return val;
      }
    });
  });
};
