'use strict';

module.exports = (TYPE_DEF, XIBLE, EXPRESS_APP) => {
  // output all registered typeDefs
  EXPRESS_APP.get('/api/typedefs', (req, res) => {
    res.json(TYPE_DEF.getAll());
  });

  // get a typeDef by given name
  EXPRESS_APP.param('typeDefName', async (req, res, next, name) => {
    const typeDef = await TYPE_DEF.getByName(name);
    if (!typeDef) {
      res.status(404).end();
      return;
    }

    req.locals.typeDef = typeDef;
    next();
  });

  EXPRESS_APP.get('/api/typedefs/:typeDefName', (req, res) => {
    res.json(req.locals.typeDef);
  });
};
