'use strict';

module.exports = (NODE) => {
  const objsIn = NODE.getInputByName('objects');
  const keysIn = NODE.getInputByName('keys');

  const objsOut = NODE.getOutputByName('objects');
  objsOut.on('trigger', async (conn, state) => {
    const [objs, keys] = await Promise.all([objsIn.getValues(state), keysIn.getValues(state)]);

    return objs
    .map((obj) => {
      const newObj = {};

      Object.keys(obj).forEach((objKey) => {
        if (keys.includes(objKey)) {
          newObj[objKey] = obj[objKey];
        }
      });

      return newObj;
    });
  });
};
