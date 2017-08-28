'use strict';

module.exports = (TYPE_DEFS, XIBLE, EXPRESS_APP) => {
  // output all registered typedefs
  EXPRESS_APP.get('/api/typedefs', (req, res) => {
    res.json(TYPE_DEFS);
  });
};
