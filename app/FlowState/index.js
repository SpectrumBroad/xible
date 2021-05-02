'use strict';

module.exports = (XIBLE) => {
  /**
  * @class Tracks state within a flow.
  * There should be no need to instantiate this class yourself.
  * Initialized state is provided to various Node event listeners.
  * @param {Object} [states={}]
  */
  function FlowState(states = {}) {
    /**
    * Sets a state for a given node.
    * Freezes the object to disallow any future adjustments.
    * @method set
    * @memberof FlowState
    * @instance
    * @param {Node} node
    * @param {Object} obj
    */
    this.set = function FlowStateSet(node, obj) {
      if (!(node instanceof XIBLE.Node)) {
        throw new Error('node must be instanceof Node');
      } else if (!(obj instanceof Object)) {
        throw new Error('obj must be instanceof Object');
      }

      Object.freeze(obj);
      states[node._id] = obj;
    };

    /**
    * Gets a state for a given node.
    * @method get
    * @memberof FlowState
    * @instance
    * @param {Node} node
    * @returns {Object} The object stored in the state handler for the given node.
    */
    this.get = function FlowStateGet(node) {
      if (!(node instanceof XIBLE.Node)) {
        throw new Error('node must be instanceof Node');
      }

      return states[node._id];
    };

    /**
    * Splits the flowState into a new FlowState.
    * @method split
    * @memberof FlowState
    * @instance
    * @returns {FlowState} The new flowState.
    */
    this.split = function FlowStateSplit() {
      return new FlowState({ ...states});
    };

    Object.freeze(this);
  }

  return {
    FlowState
  };
};
