'use strict';

const XibleEditorFlow = (() => {
  const constructed = {};

  class XibleEditorFlow extends xibleWrapper.Flow {
    constructor(obj) {
      super(obj);

      if (obj && obj._id && this.constructor === XibleEditorFlow) {
        if (constructed[obj._id]) {
          return constructed[obj._id];
        }

        if (!constructed[obj._id]) {
          constructed[obj._id] = this;
        }
      }

      // set global appropriately when it's changed
      this.on('global', (output) => {
        this.setGlobalFromOutput(output);
      });
    }

    removeGlobalConnectors() {
      this.nodes.forEach((node) => {
        node.getOutputs().forEach((output) => {
          output.connectors.filter((conn) => conn.global)
            .forEach((globalConn) => globalConn.delete());
        });
      });
    }

    setGlobalFromOutput(output) {
      // if we have another global of this type, ignore
      let globalOutputsByType = this.getGlobalOutputs()
        .filter((gOutput) => gOutput.type === output.type);
      if (
        (!output.global && globalOutputsByType.length)
        || (output.global && globalOutputsByType.length > 1)
      ) {
        return;
      }
      globalOutputsByType = null;

      for (let i = 0; i < this.nodes.length; i += 1) {
        this.nodes[i].getInputs().forEach((input) => {
          if (
            input.type === output.type && !input.connectors.filter((conn) => !conn.global).length
            && input.global !== false
          ) {
            input.setGlobal(output.global ? true : undefined);
          }
        });
      }
    }

    stopAllInstances() {
      const stopPromise = super.stopAllInstances();
      this.undirect();
      return stopPromise;
    }

    initNodes(nodes) {
      this.nodes = [];
      nodes.forEach((node) => this.addNode(new XibleEditorNode(node)));
    }

    initConnectors(connectors) {
      this.connectors = [];
      connectors.forEach((conn) => {
        conn.origin = this.getOutputById(conn.origin);
        conn.destination = this.getInputById(conn.destination);

        this.addConnector(new XibleEditorConnector(conn));
      });
    }

    undirect() {
      if (this.directedInstance) {
        this.directedInstance.stop();
      }

      this.nodes.forEach((node) => {
        node.element.classList.remove('nodirect');

        if (node._directSetDataListener) {
          node.removeListener('setdata', node._directSetDataListener);
          delete node._directSetDataListener;
        }
      });

      this.connectors.forEach((connector) => {
        connector.element.classList.remove('nodirect');
      });

      this.directedInstance = null;
    }

    async direct(directNodes) {
      if (!this.directedInstance) {
        this.directedInstance = await this.createInstance();
      }

      return this.directedInstance.direct(directNodes);
      // TODO: set related styling here instead of in XibleEditor where it is now
    }

    // TODO: simply have XibleEditor set viewState to loadedFlow directly?
    toJson(...args) {
      this.removeGlobalConnectors();

      // the viewstate
      this.setViewState({
        left: this.editor.left,
        top: this.editor.top,
        zoom: this.editor.zoom,
        backgroundLeft: this.editor.backgroundLeft,
        backgroundTop: this.editor.backgroundTop
      });

      return super.toJson(...args);
    }
  }

  return XibleEditorFlow;
})();
