'use strict';

module.exports = (NODE) => {
  const stringsIn = NODE.getInputByName('strings');

  const stringsOut = NODE.getOutputByName('strings');
  stringsOut.on('trigger', async (conn, state) => {
    const strs = await stringsIn.getValues(state);

    let flags = 's';
    if (NODE.data.global) {
      flags += 'g';
    }
    if (NODE.data.ignoreCase) {
      flags += 'i';
    }

    let match = NODE.data.match;
    if (!NODE.data.regex) {
      match = match.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    const regexpMatch = new RegExp(match, flags);

    return strs.map(str =>
      str.replace(regexpMatch, NODE.data.replacement)
    );
  });
};
