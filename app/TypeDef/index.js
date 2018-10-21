'use strict';

module.exports = (XIBLE, EXPRESS_APP) => {
  const typeDefs = {};

  class TypeDef {
    constructor(obj) {
      if (!obj) {
        throw new Error('Missing "object" argument');
      }
      if (!obj.name) {
        throw new Error('Missing "name" property');
      }
      if (obj) {
        Object.assign(this, obj);
      }

      if (!this.extends && this.name !== 'object') {
        this.extends = 'object';
      }
    }

    /**
     * Verifies whether the given typeDef matches this typeDef.
     * If not matched directly, the extends property (-tree) of the given typeDef
     * is verified against this typeDef.
     * @returns {Boolean}
     */
    matches(typeDef) {
      if (typeDef === this) {
        return true;
      }

      if (!typeDef || !typeDef.extends) {
        return false;
      }

      // check for extends
      if (typeof typeDef.extends === 'string') {
        const extendsTypeDef = typeDefs[typeDef.extends];
        if (!extendsTypeDef || extendsTypeDef === typeDef) {
          return false;
        }

        return this.matches(extendsTypeDef);
      }

      if (Array.isArray(typeDef.extends)) {
        for (let i = 0; i < typeDef.extends.length; i += 1) {
          const extendsTypeDef = typeDefs[typeDef.extends[i]];
          if (!extendsTypeDef) {
            continue;
          }

          if (this.matches(extendsTypeDef)) {
            return true;
          }
        }
      }

      return false;
    }

    static getAll() {
      return typeDefs;
    }

    static getByName(name) {
      return typeDefs[name];
    }

    static add(typeDef) {
      if (!(typeDef instanceof TypeDef)) {
        typeDef = new TypeDef(typeDef);
      }
      typeDefs[typeDef.name] = typeDef;
      return typeDef;
    }

    static toJSON() {
      return typeDefs;
    }
  }

  if (EXPRESS_APP) {
    require('./routes.js')(TypeDef, XIBLE, EXPRESS_APP);
  }

  return {
    TypeDef
  };
};
