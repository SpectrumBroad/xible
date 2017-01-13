const CHART_MAX_TICKS = 60;

class XibleEditor {

	constructor() {

		this.element = document.createElement('div');
		this.element.classList.add('xible');
		this.element.appendChild(document.createElement('div'));
		this.element.firstChild.classList.add('editor');
		this.element.firstChild.style.transformOrigin = '0 0';

		this.selection = [];
		this.copySelection = null;

		this.flows = {};
		this.loadedFlow = null;

		this.enableInsertNode();
		this.enableZoom();
		this.enablePan();
		this.enableHook();
		this.enableSelection();
		this.initConsole();

	}

	describeNode(node) {

		if (!(node instanceof XibleEditorNode)) {
			throw new Error(`1st argument must be a XibleEditorNode`);
		}

		node = node.duplicate(true);

		node.emit('beforeAppend');

		let describeEl = this.element.appendChild(document.createElement('div'));
		describeEl.classList.add('describe');

		//close button
		let closeButton = describeEl.appendChild(document.createElement('button'));
		closeButton.setAttribute('type', 'button');
		closeButton.appendChild(document.createTextNode('X'));
		closeButton.onclick = () => {
			this.element.removeChild(describeEl);
		};

		//ignore default xible container event handlers
		describeEl.addEventListener('wheel', (event) => {
			event.stopPropagation();
		});

		describeEl.addEventListener('mousedown', (event) => {
			event.stopPropagation();
		});

		describeEl.addEventListener('mouseup', (event) => {
			event.stopPropagation();
		});

		describeEl.addEventListener('click', (event) => {
			event.stopPropagation();
		});

		//append the node descriptionEl
		let descriptionEl = describeEl.appendChild(document.createElement('p'));
		descriptionEl.appendChild(document.createTextNode(node.description || 'not described'));

		if (!node.description) {
			descriptionEl.classList.add('none');
		}

		//append the node
		node.setPosition(0, 0);
		node.element.style.transform = '';

		//append the node type information
		/*
		let typeEl = node.element.querySelector('h1').appendChild(document.createElement('p'));
		typeEl.appendChild(document.createElement('span')).appendChild(document.createTextNode(node.type));

		if(node.type === 'action') {
			typeEl.appendChild(document.createTextNode('Double-click this header in the flow overview to start it in directed mode.'));
		}
		*/

		//we need to append early because the offsetHeight/scrollHeight of
		//the description els are required to check for overflow
		describeEl.appendChild(node.element);

		//add the description for each io
		node.getInputs().concat(node.getOutputs()).forEach((io) => {

			//get rid of event listeners
			let clonedNode = io.element.cloneNode(true);
			io.element.parentNode.replaceChild(clonedNode, io.element);
			io.element = clonedNode;

			//add description
			let descriptionEl = io.element.appendChild(document.createElement('p'));
			descriptionEl.appendChild(document.createElement('span')).appendChild(document.createTextNode(io.type || 'any'));
			descriptionEl.appendChild(document.createTextNode(io.description || 'not described'));

			if (!io.description) {
				descriptionEl.classList.add('none');
			}

			if (descriptionEl.scrollHeight > descriptionEl.offsetHeight) {
				descriptionEl.classList.add('overflow');
			}

		});

		//handle descriptions for input elements and labels
		node.on('editorContentLoad', () => {

			if (!node.editorContentEl) {
				return;
			}

			node.element.onmouseenter = (event) => {
				node.getRootLabelElements().forEach((label) => {
					label.classList.add('nodeHover');
				});
			};

			node.element.onmouseleave = (event) => {
				node.getRootLabelElements().forEach((label) => {
					label.classList.remove('nodeHover');
				});
			};

			//add the description for each input element
			node.getRootLabelElements().forEach((label) => {

				let description = label.getAttribute('data-description');

				//this is actually not allowed
				//a label may not contain a block element
				let descriptionEl = label.appendChild(document.createElement('p'));
				descriptionEl.appendChild(document.createTextNode(description || 'not described'));

				if (!description) {
					descriptionEl.classList.add('none');
				}

				if (descriptionEl.scrollHeight > descriptionEl.offsetHeight) {
					descriptionEl.classList.add('overflow');
				}

			});

		});

		node.editor = this;

		node.emit('append');

	}

	enableInsertNode() {

		//detail div for downloading new nodes
		let detailDiv = document.body.appendChild(document.createElement('div'));
		detailDiv.setAttribute('id', 'detailNodeSelector');
		detailDiv.classList.add('hidden');
		let detailDivSub = detailDiv.appendChild(document.createElement('div'));

		//check if this is maintained by spectrumbroad
		detailDivSub.appendChild(document.createElement('h1')).appendChild(document.createTextNode('maintained'));
		detailDivSub.appendChild(document.createElement('p')).appendChild(document.createTextNode('Spectrumbroad maintains this node.'));

		//permissions in detailDiv
		detailDivSub.appendChild(document.createElement('h1')).appendChild(document.createTextNode('Permissions'));
		detailDivSub.appendChild(document.createElement('p')).appendChild(document.createTextNode('This node requires the following permissions;'));
		let detailDivPermissionsUl = detailDivSub.appendChild(document.createElement('ul'));

		let detailConfirmButton = detailDiv.appendChild(document.createElement('button'));
		detailConfirmButton.appendChild(document.createTextNode('Confirm'));
		detailConfirmButton.setAttribute('type', 'button');
		detailConfirmButton.onclick = () => {

			detailDiv.classList.add('hidden');

		};

		let detailCancelButton = detailDiv.appendChild(document.createElement('button'));
		detailCancelButton.appendChild(document.createTextNode('Cancel'));
		detailCancelButton.classList.add('cancel');
		detailCancelButton.setAttribute('type', 'button');
		detailCancelButton.onclick = () => {

			div.classList.add('hidden');
			detailDiv.classList.add('hidden');

		};

		//the div containing the node list
		let div = document.body.appendChild(document.createElement('div'));
		div.setAttribute('id', 'nodeSelector');
		div.classList.add('hidden');

		//this list will be populated with the local installed nodes
		let localUl = document.createElement('ul');

		let filterInput = div.appendChild(document.createElement('input'));
		filterInput.setAttribute('type', 'text');
		filterInput.setAttribute('placeholder', 'filter nodes');
		filterInput.addEventListener('input', (event) => {

			let noResults = true;
			localUl.querySelectorAll('li').forEach((li) => {

				let filterInputValue = filterInput.value.toLowerCase();
				let vals = filterInputValue.replace(/[\W_]+/g, ' ').split(' ');
				let textContent = li.textContent.toLowerCase();

				li.classList.remove('headerMatchExact', 'headerMatchPartial');
				if (!filterInput.value || vals.every((val) => textContent.indexOf(val) > -1)) {

					//specify more relevant search results
					let headerTextContent = li.firstChild.textContent.toLowerCase();
					if (headerTextContent === filterInputValue) {
						li.classList.add('headerMatchExact');
					} else if (vals.every((val) => headerTextContent.indexOf(val) > -1)) {
						li.classList.add('headerMatchPartial');
					}

					li.classList.remove('hidden');
					noResults = false;

				} else {
					li.classList.add('hidden');
				}

			});

			if (noResults) {
				div.classList.add('noresults');
			} else {
				div.classList.remove('noresults');
			}

		});

		div.appendChild(localUl);

		function detailedNodeView(li, nodeName, node) {

			li.classList.add('downloading');

			detailDiv.classList.remove('hidden');
			detailDiv.style.top = div.style.top;
			detailDiv.style.left = (parseInt(div.style.left) + detailDiv.offsetWidth) + 'px';

			//add the permissions to the list
			detailDivPermissionsUl.innerHTML = '';
			detailDivPermissionsUl.appendChild(document.createElement('li')).appendChild(document.createTextNode('filesystem'));
			detailDivPermissionsUl.appendChild(document.createElement('li')).appendChild(document.createTextNode('network'));
			detailDivPermissionsUl.appendChild(document.createElement('li')).appendChild(document.createTextNode('process'));

		}

		function buildNode(nodeName, node) {

			//list element containing the node heading and description
			let li = document.createElement('li');

			//the heading element containing the node name
			let h1 = li.appendChild(document.createElement('h1'));
			h1.appendChild(document.createTextNode(nodeName));
			h1.setAttribute('title', nodeName);

			//scroll text if it overflows
			li.addEventListener('mouseenter', (event) => {

				if (h1.scrollWidth > h1.offsetWidth) {
					h1.classList.add('overflow');
				}

			});

			li.addEventListener('mouseleave', (event) => {
				h1.classList.remove('overflow');
			});

			//description
			let description = node.description;
			if (description) {
				li.appendChild(document.createElement('p')).appendChild(document.createTextNode(description));
			}

			return li;

		}

		//add the node
		//we do this onmousedown so the user can drag immediately
		let hookNode = (li, node) => {

			li.addEventListener('mousedown', (event) => {

				let actionsOffset = this.getOffsetPosition();
				let editorNode = this.addNode(new XibleEditorNode(node));
				this.loadedFlow.addNode(editorNode);
				editorNode.setPosition(((event.pageX - actionsOffset.left - this.left) / this.zoom) - (editorNode.element.firstChild.offsetWidth / 2), ((event.pageY - actionsOffset.top - this.top) / this.zoom) - (editorNode.element.firstChild.offsetHeight / 2));
				this.deselect();
				this.select(editorNode);
				this.initDrag(event);

				div.classList.add('hidden');

			});

		};

		//create a search online button
		let searchOnlineButton = div.appendChild(document.createElement('button'));
		searchOnlineButton.setAttribute('type', 'button');
		searchOnlineButton.appendChild(document.createTextNode('search online'));
		searchOnlineButton.setAttribute('title', 'Search xible.io for nodes matching your filter');
		searchOnlineButton.addEventListener('click', (event) => {

			if (!filterInput.value) {
				return;
			}

			xibleWrapper.Node
				.searchRegistry(filterInput.value)
				.then((nodes) => {

					let nodeNames = Object.keys(nodes);
					nodeNames.forEach((nodeName) => {

						let li = buildNode(nodeName, nodes[nodeName]);
						li.classList.add('online');
						li.onclick = (event) => {

							//open the detailed confirmation view
							detailedNodeView(li, nodeName, nodes[nodeName]);

						};
						localUl.appendChild(li);

					});

					if (nodeNames.length) {
						div.classList.remove('noresults');
					} else {
						div.classList.add('noresults');
					}

				})
				.catch((err) => {
					div.classList.add('noresults');
				});

		});

		//get the installed nodes
		let req = new OoHttpRequest('GET', `https://${xibleWrapper.hostname}:${xibleWrapper.port}/api/nodes`);
		req.toObject(Object).then((nodes) => {

			Object.keys(nodes).forEach((nodeName) => {

				let li = buildNode(nodeName, nodes[nodeName]);
				hookNode(li, nodes[nodeName]);
				localUl.appendChild(li);

			});

		});

		function openNodeSelector() {

			localUl.querySelectorAll('li').forEach((li) => {

				if (filterInput.value && li.textContent.indexOf(filterInput.value) === -1) {
					li.classList.add('hidden');
				} else {
					li.classList.remove('hidden');
				}

			});

			div.classList.remove('hidden');
			div.style.left = event.pageX + 'px';
			div.style.top = event.pageY + 'px';

			//ensure we are not overflowing the chrome
			let clientRect = div.getBoundingClientRect();
			if (clientRect.top + clientRect.height > window.innerHeight) {
				div.style.top = (event.pageY - clientRect.height) + 'px';
			}

			filterInput.focus();

		}

		//open the node menu on contextmenu
		document.body.addEventListener('contextmenu', (event) => {

			if (this.loadedFlow && (event.target === this.element || event.target === this.element.firstChild)) {

				openNodeSelector();
				event.preventDefault();
				return false;

			}

		});

		//open the node menu on double click
		document.body.addEventListener('dblclick', (event) => {

			if (!event.ctrlKey && this.loadedFlow && (event.target === this.element || event.target === this.element.firstChild)) {
				openNodeSelector();
			}

		});

		//hide the nodeSelector element if selection moves elsewhere
		document.body.addEventListener('mousedown', (event) => {

			if (!div.classList.contains('hidden') && !div.contains(event.target) && !detailDiv.contains(event.target)) {

				div.classList.add('hidden');
				detailDiv.classList.add('hidden');

			}

		});

	}


	initConsole() {

		this.console = document.getElementById('console');

		if (!this.console) {
			return;
		}

		this.initStats();

	}

	setGlobalFromOutput(flow, output) {

		flow.nodes.forEach((node) => {

			node.getInputs().forEach((input) => {

				if (input.type === output.type && !input.connectors.length) {
					input.setGlobal(output.global);
				}

			});

		});

	}


	/**
	 *	Gets the flows from the Xible API
	 */
	getFlows() {
		/*

		TODO: should use XibleWrapper.flows.getAll() instead
				return xibleWrapper.Flows.getAll().then((flows) => {

					Object.keys(flows).forEach((flowId) => {

						let flow = new XibleEditorFlow(flows[flowId]);
						this.flows[flowId] = flow;

						//set global appropriately when it's changed
						flow.on('global', (output) => this.setGlobalFromOutput(flow, output));

					});

					return this.flows;

				});
		*/
		return new Promise((resolve, reject) => {

			let req = new OoHttpRequest('GET', `https://${xibleWrapper.hostname}:${xibleWrapper.port}/api/flows`);

			req.toObject(Object).then((flows) => {

				Object.keys(flows).forEach((flowId) => {

					let flow = new XibleEditorFlow(flows[flowId]);
					this.flows[flowId] = flow;

					//set global appropriately when it's changed
					flow.on('global', (output) => this.setGlobalFromOutput(flow, output));

				});

				resolve(this.flows);

			});

		});

	}

	/**
	 *	Sets up the stat charts
	 */
	initStats() {

		if (this.memChart) {
			this.memChart.destroy();
		}

		if (this.cpuChart) {
			//triggers an error? probably a bug
			//this.cpuChart.destroy();
		}

		this.memChart = null;
		this.cpuChart = null;
		this.delayChart = null;

		if (!this.console) {
			return;
		}

		let delayCanvas = document.getElementById('delayChart');
		this.delayChart = new Chart(delayCanvas, {
			type: 'line',
			data: {
				labels: new Array(CHART_MAX_TICKS),
				datasets: [{
					lineTension: 0,
					pointRadius: 0,
					backgroundColor: 'purple',
					borderColor: 'purple',
					borderWidth: 1,
					label: 'nanoseconds',
					data: []
				}]
			},

			options: {
				legend: {
					display: false
				},
				tooltips: {
					enabled: false
				},
				layout: {
					padding: 0
				},
				scales: {
					xAxes: [{
						display: false
					}],
					yAxes: [{
						position: 'right',
						gridLines: {
							tickMarkLength: 5
						},
						ticks: {
							beginAtZero: true,
							padding: 2,
							fontColor: '#666',
							mirror: true,
							maxTicksLimit: 4,
							callback: (value) => `${value} μs`
						}
					}]
				}
			}
		});

		let cpuCanvas = document.getElementById('cpuChart');
		this.cpuChart = new Chart(cpuCanvas, {
			type: 'line',
			data: {
				labels: new Array(CHART_MAX_TICKS),
				datasets: [{
					lineTension: 0,
					pointRadius: 0,
					backgroundColor: 'rgba(75, 192, 192, 1)',
					borderColor: 'rgba(75, 192, 192, 1)',
					borderWidth: 1,
					label: 'percentage',
					data: []
				}]
			},

			options: {
				legend: {
					display: false
				},
				tooltips: {
					enabled: false
				},
				layout: {
					padding: 0
				},
				scales: {
					xAxes: [{
						display: false
					}],
					yAxes: [{
						position: 'right',
						gridLines: {
							tickMarkLength: 5
						},
						ticks: {
							beginAtZero: true,
							padding: 2,
							fontColor: '#666',
							mirror: true,
							maxTicksLimit: 4,
							callback: (value) => `${value} %`
						}
					}]
				}
			}
		});

		let memCanvas = document.getElementById('memChart');
		this.memChart = new Chart(memCanvas, {
			type: 'line',
			data: {
				labels: new Array(CHART_MAX_TICKS),
				datasets: [{
					lineTension: 0,
					pointRadius: 0,
					borderColor: 'rgba(255,99,132,1)',
					backgroundColor: 'rgba(255,99,132,1)',
					borderWidth: 1,
					label: 'heap total',
					data: []
				}, {
					lineTension: 0,
					pointRadius: 0,
					borderColor: 'rgba(54, 162, 235, 1)',
					backgroundColor: 'rgba(54, 162, 235, 1)',
					borderWidth: 1,
					label: 'heap used',
					data: []
				}, {
					lineTension: 0,
					pointRadius: 0,
					borderColor: 'rgba(255, 206, 86, 1)',
					backgroundColor: 'rgba(255, 206, 86, 1)',
					borderWidth: 1,
					label: 'rss',
					data: []
				}]
			},

			options: {
				legend: {
					display: false
				},
				tooltips: {
					enabled: false
				},
				layout: {
					padding: 0
				},
				scales: {
					xAxes: [{
						display: false
					}],
					yAxes: [{
						position: 'right',
						gridLines: {
							tickMarkLength: 5
						},
						ticks: {
							beginAtZero: true,
							padding: 2,
							fontColor: '#666',
							mirror: true,
							maxTicksLimit: 4,
							callback: (value) => `${value} MiB`
						}
					}]
				}
			}
		});

	}

	/**
	 *	Handles a WebSocket message
	 *	@param {Object}	json	The message Object, the JSON.parse result of WebSocketMessageEvent.data
	 */
	webSocketMessageHandler(json) {

		var node;

		if (json.nodeId) {
			node = this.loadedFlow.getNodeById(json.nodeId);
			if (!node) {
				return;
			}
		}

		if (json.flowId && !this.flows[json.flowId]) {
			return;
		}
		switch (json.method) {

			case 'xible.messages':

				json.messages.forEach((message) => {
					this.webSocketMessageHandler(message);
				});
				break;

			case 'xible.removeAllStatuses':

				this.loadedFlow.removeAllStatuses();
				break;

			case 'xible.node.addStatus':
				if (node) {
					node.addStatus(json.status);
				}

				break;

			case 'xible.node.addProgressBar':
				if (node) {
					node.addProgressBar(json.status);
				}

				break;

			case 'xible.node.updateProgressBarById':
				if (node) {
					node.updateProgressBarById(json.status._id, json.status);
				}

				break;

			case 'xible.node.removeStatusById':
				if (node) {
					node.removeStatusById(json.status._id, json.status.timeout);
				}

				break;

			case 'xible.node.removeAllStatuses':
				if (node) {
					node.removeAllStatuses();
				}

				break;

			case 'xible.node.setTracker':
				if (node) {
					node.setTracker(json.status);
				}

				break;

			case 'xible.flow.removeAllStatuses':

				this.flows[json.flowId].removeAllStatuses();
				break;

			case 'xible.flow.stopped':

				this.flows[json.flowId].emit('stopped');
				//XibleEditorFlow.emit('stopped', this.flows[json.flowId]);
				break;

			case 'xible.flow.stopping':

				this.flows[json.flowId].emit('stopping');
				//XibleEditorFlow.emit('stopping', this.flows[json.flowId]);
				break;

			case 'xible.flow.starting':

				this.flows[json.flowId].emit('starting');
				//XibleEditorFlow.emit('starting', this.flows[json.flowId]);
				break;

			case 'xible.flow.started':

				this.flows[json.flowId].emit('started');
				//XibleEditorFlow.emit('started', this.flows[json.flowId]);
				break;

			case 'xible.flow.usage':

				if (!this.memChart || !this.cpuChart || !this.delayChart || !this.loadedFlow) {
					break;
				}

				//only run this on the loaded flow
				let flow = json.flows.find((flow) => flow._id === this.loadedFlow._id);
				if (!flow) {
					break;
				}

				while (this.memChart.data.datasets[0].data.length !== this.memChart.data.labels.length) {

					this.memChart.data.datasets[0].data.push(null);
					this.memChart.data.datasets[1].data.push(null);
					this.memChart.data.datasets[2].data.push(null);

					this.cpuChart.data.datasets[0].data.push(null);

					this.delayChart.data.datasets[0].data.push(null);

				}

				if (this.memChart.data.datasets[0].data.length === this.memChart.data.labels.length) {

					this.memChart.data.datasets[0].data.shift();
					this.memChart.data.datasets[1].data.shift();
					this.memChart.data.datasets[2].data.shift();

					this.cpuChart.data.datasets[0].data.shift();

					this.delayChart.data.datasets[0].data.shift();

				}

				this.memChart.data.datasets[2].data.push(Math.round(flow.usage.memory.rss / 1024 / 1024));
				this.memChart.data.datasets[1].data.push(Math.round(flow.usage.memory.heapTotal / 1024 / 1024));
				this.memChart.data.datasets[0].data.push(Math.round(flow.usage.memory.heapUsed / 1024 / 1024));
				this.memChart.update(0);

				this.cpuChart.data.datasets[0].data.push(flow.usage.cpu.percentage);
				this.cpuChart.update(0);

				this.delayChart.data.datasets[0].data.push(flow.usage.delay);
				this.delayChart.update(0);

				break;

		}

	}

	/**
	 *	Sets up message events for a (open) WebSocket
	 *	@param	{WebSocket}	socket	The WebSocket to listen to
	 */
	initWebSocket(socket) {

		if (!socket) {
			return;
		}

		socket.addEventListener('close', (event) => {

			if (!this.loadedFlow) {
				return;
			}

			//remove all statuses
			this.loadedFlow.removeAllStatuses();

		});

		socket.addEventListener('message', (event) => {

			if (!this.loadedFlow) {
				return;
			}

			var json = JSON.parse(event.data);
			this.webSocketMessageHandler(json);

		});

	}

	/**
	 *	Returns a Flow by the given id, or undefined if not found
	 *	@param	{Number}
	 *	@return	{XibleEditorFlow|Void}	The found Flow
	 */
	getFlowById(id) {
		return this.flows.find((flow) => flow._id === id);
	}

	/**
	 *	Appends the given Node to the Editor
	 *	@param	{XibleEditorNode}	node	The Node to add
	 *	@return	{XibleEditorNode}	The given Node
	 */
	addNode(node) {

		node.emit('beforeAppend');

		this.element.firstChild.appendChild(node.element);
		node.editor = this;

		//global inputs
		//FIXME: move this to the XibleFlow def and track all global outputs there
		let globalTypes = [].concat(...this.loadedFlow.nodes.map((node) => {

			return node.getOutputs()
				.filter((output) => output.global)
				.map((output) => output.type);

		}));

		node.getInputs().forEach((input) => {

			if (globalTypes.indexOf(input.type) > -1) {
				input.setGlobal(true);
			}

		});

		globalTypes = null;

		node.emit('append');

		return node;

	}

	/**
	 *	Append a Connector to the Editor
	 *	@param	{XibleEditorConnector}	connector	The Connector to add
	 *	@return {XibleEditorConnector}	The given connector
	 */
	addConnector(connector) {

		connector.editor = this;
		this.element.firstChild.appendChild(connector.element);
		connector.draw();

		return connector;

	}

	/**
	 *	Remove a Node or Connector from the Editor
	 *	@param	{(XibleEditorNode|XibleEditorConnector)}	obj	The object to remove
	 */
	deleteChild(obj) {

		if (obj instanceof XibleEditorNode) {
			this.deleteNode(obj);
		} else if (obj instanceof XibleEditorConnector) {
			this.deleteConnector(obj);
		}

	}

	/**
	 *	Remove a Node from the Editor
	 *	@param	{XibleEditorNode}	node	The Node to remove
	 */
	deleteNode(node) {

		let index;
		if ((index = this.loadedFlow.nodes.indexOf(node)) > -1) {
			this.loadedFlow.nodes.splice(index, 1);
		}

		this.deselect(node);

		node.editor = null;

		//remove from dom
		if (node.element.parentNode) {
			this.element.firstChild.removeChild(node.element);
		}

	}

	/**
	 *	Remove a Connector from the Editor
	 *	@param	{XibleEditorConnector}	connector	The Connector to remove
	 */
	deleteConnector(connector) {

		let index;
		if ((index = this.loadedFlow.connectors.indexOf(connector)) > -1) {
			this.loadedFlow.connectors.splice(index, 1);
		}

		this.deselect(connector);

		connector.editor = null;

		//remove from dom
		if (connector.element.parentNode) {
			this.element.firstChild.removeChild(connector.element);
		}

	}

	/**
	 *	Opens the given flow in the editor
	 *	@param	{XibleEditorFlow}	flow	The flow to open/view/edit
	 */
	viewFlow(flow) {

		if (!(flow instanceof XibleEditorFlow)) {
			throw new Error(`not a flow`);
		}

		if (this.loadedFlow) {

			this.loadedFlow.removeAllStatuses();
			this.loadedFlow.editor = null;
		}

		//clean
		this.element.firstChild.innerHTML = '';

		flow.editor = this;
		this.loadedFlow = flow;

		//setup the nodes
		flow.nodes.forEach((node) => {
			this.addNode(node);
		});

		//setup the connectors
		flow.connectors.forEach((connector) => {
			this.addConnector(connector);
		});

		//setup the viewstate
		this.left = flow.viewState.left;
		this.top = flow.viewState.top;
		this.zoom = flow.viewState.zoom;
		this.backgroundLeft = flow.viewState.backgroundLeft;
		this.backgroundTop = flow.viewState.backgroundTop;
		this.transform();

		//setup stats
		this.initStats();

	}

	/**
	 *	returns the non-transformed offset position
	 */
	getOffsetPosition() {

		var el = this.element.firstChild;
		var actionsOffsetTop = 0;
		var actionsOffsetLeft = 0;

		do {

			actionsOffsetTop += el.offsetTop;
			actionsOffsetLeft += el.offsetLeft;

		} while ((el = el.offsetParent));

		return {
			left: actionsOffsetLeft,
			top: actionsOffsetTop
		};

	}

	/**
	 *	transforms the element according to the object properties
	 */
	transform() {

		this.element.firstChild.style.transform = 'translate(' + this.left + 'px, ' + this.top + 'px) scale(' + this.zoom + ')';
		this.element.style.backgroundPosition = this.backgroundLeft + 'px ' + this.backgroundTop + 'px';

	}

	/**
	 *	Deselect everything if no arguments provided, or remove just the first argument
	 *	@param	{(XibleEditorNode|XibleEditorConnector)}	[obj]	The Node or Connector to remove from the selection
	 */
	deselect(obj) {

		if (obj) {

			let selectionIndex = this.selection.indexOf(obj);
			if (selectionIndex > -1) {

				this.selection.splice(selectionIndex, 1);
				obj.element.classList.remove('selected');

			}

			return;

		}

		this.selection.forEach((sel) => sel.element.classList.remove('selected'));
		this.selection = [];

	}

	/**
	 *	Decides what to do with the selection, based on an event
	 *	Example: adds node to the selection when ctrl is pressed and a node is clicked
	 *	@param	{Event}	event	The event taking place
	 *	@param	{(XibleEditorNode|XibleEditorConnector)}	[obj]	New Node or Connector
	 */
	toggleSelectionOnMouseEvent(event, obj) {

		if (event.button === 1) {
			return;
		}

		let selectionIndex = this.selection.indexOf(obj);

		if (!event.ctrlKey && event.type === 'mousedown' && selectionIndex === -1) {

			this.deselect();
			this.selection.push(obj);
			obj.element.classList.add('selected');

		} else if (event.ctrlKey && event.type === 'mouseup' && selectionIndex === -1 && !window.nodeDragHasFired) {

			this.selection.push(obj);
			obj.element.classList.add('selected');

		} else if (!event.ctrlKey && event.type === 'mouseup' && selectionIndex > -1 && !window.nodeDragHasFired) {

			this.deselect();
			this.selection.push(obj);
			obj.element.classList.add('selected');

		} else if (event.ctrlKey && event.type === 'mouseup' && selectionIndex > -1 && !window.nodeDragHasFired) {
			this.deselect(obj);
		}

		/*

		if(event.ctrlKey && eevent.type === 'mouseup' && selectionIndex > -1 && window.nodeDragHasFired)
			duplicate (onmousemove already)
			selection to duplicates

		if(event.ctrlKey && event.type === 'mouseup' && selectionIndex === -1 && window.nodeDragHasFired)
			select (onmousemove already)
			duplicate (onmousemove already)
			selection to duplicates

		*/

	}

	/**
	 *	Adds a Node or Connector to the selection
	 *	@param	{(XibleEditorNode|XibleEditorConnector)}	obj	The Node or Connector to add
	 */
	select(obj) {

		let selectionIndex = this.selection.indexOf(obj);

		if (selectionIndex == -1) {

			this.selection.push(obj);
			obj.element.classList.add('selected');

		}

	}

	/**
	 *	inits a drag of the selection (after mousedown)
	 *	@param	{Event}	event	the (mouse)event for the drag
	 */
	initDrag(event) {

		//exit if we're already dragging
		if (window.nodeDragListener || !this.selection.length) {
			return;
		}

		//init the start positions of the drag
		let initPageX = event.pageX;
		let initPageY = event.pageY;
		window.nodeDragHasFired = false;

		//get all the connectors for the selected node
		//so we can check if we are not splicing a connector for the selected node
		//because that wouldn't make sense
		let selNodeConnectors = [];
		let selNode;
		if (this.selection.length === 1 && this.selection[0] instanceof XibleEditorNode) {

			selNode = this.selection[0];

			selNode.getInputs().concat(selNode.getOutputs()).forEach((io) => {
				selNodeConnectors.push(...io.connectors);
			});

		}

		//catch the mousemove event
		document.body.addEventListener('mousemove', window.nodeDragListener = (event) => {

			//check if mouse actually moved
			//see crbug.com/327114
			if (initPageX === event.pageX && initPageY === event.pageY) {
				return;
			}

			window.nodeDragHasFired = true;

			//check how much we moved since the initial mousedown event
			let relativePageX = (event.pageX - initPageX) / this.zoom;
			let relativePageY = (event.pageY - initPageY) / this.zoom;

			//save the values for the next trigger of this function
			initPageX = event.pageX;
			initPageY = event.pageY;

			//update position of each of the selection items that cares
			var i = 0;
			this.selection.forEach((sel) => {

				if (typeof(sel.setPosition) === 'function') {
					sel.setPosition(sel.left + relativePageX, sel.top + relativePageY);
					i++;
				}

			});

			//check if the selection is hovering a connector that it could be part of
			if (this.selection.length === 1 && this.selection[0] instanceof XibleEditorNode) {

				let selBounding = selNode.element.getBoundingClientRect();
				let selLeftAvg = selNode.left + (selBounding.width / this.zoom) / 2;
				let selTopAvg = selNode.top + (selBounding.height / this.zoom) / 2;

				let previousSpliceConnector = window.nodeDragSpliceConnector;

				let hasSpliceConnector = this.loadedFlow.connectors.some((connector) => {

					//ignore hovering over connectors that are connected to the selected node
					if (selNodeConnectors.indexOf(connector) > -1) {
						return false;
					}

					if (
						(selNode.getInputsByType(connector.origin.type).length || (connector.origin.type !== 'trigger' && selNode.getInputsByType(null).length)) &&
						(selNode.getOutputsByType(connector.origin.type).length || (connector.destination.type !== 'trigger' && selNode.getOutputsByType(null).length) || (selNode.outputs.length && !connector.destination.type && selNode.outputs.length > selNode.getOutputsByType('trigger').length))
					) {

						let connBounding = connector.element.getBoundingClientRect();
						if (Math.abs((connector.left + (connBounding.width / this.zoom) / 2) - selLeftAvg) < 20 && Math.abs((connector.top + (connBounding.height / this.zoom) / 2) - selTopAvg) < 20) {

							window.nodeDragSpliceConnector = connector;
							connector.element.classList.add('splice');
							selNode.element.classList.add('splice');
							return true;

						}

					}

				});

				if (!hasSpliceConnector) {

					window.nodeDragSpliceConnector = null;
					selNode.element.classList.remove('splice');

				}

				if (previousSpliceConnector && (!hasSpliceConnector || previousSpliceConnector !== window.nodeDragSpliceConnector)) {
					previousSpliceConnector.element.classList.remove('splice');
				}

			}

		});

	}

	/**
	 *	Starts an area selector based on a mouse event
	 *	@param	{Event} event	the (mouse)event which triggered the area selector
	 */
	initAreaSelector(event) {

		//exit if we're already dragging
		if (window.areaMoveListener) {
			return;
		}

		//init the start positions of the drag
		var initPageX = event.pageX;
		var initPageY = event.pageY;

		//get the xible position
		var xibleBounding = this.element.getBoundingClientRect();
		var areaElLeft = initPageX - xibleBounding.left;
		var areaElTop = initPageY - xibleBounding.top;

		//create the area element
		let areaEl;

		//catch the mousemove event
		document.body.addEventListener('mousemove', window.areaMoveListener = (event) => {

			if (!this.loadedFlow) {
				return;
			}

			//check how much we moved since the initial mousedown event
			var relativePageX = event.pageX - initPageX;
			var relativePageY = event.pageY - initPageY;

			if (Math.abs(relativePageY) < 3 && Math.abs(relativePageX) < 3) {
				return;
			} else if (!areaEl) {

				areaEl = document.createElement('div');
				areaEl.classList.add('area');
				areaEl.style.transform = `translate(${areaElLeft}px, ${areaElTop}px)`;
				this.element.appendChild(areaEl);

			}

			//the left and top position of the area element compared to the document/page
			var areaElPageLeft = initPageX;
			var areaElPageTop = initPageY;

			//allow for negative selections
			if (relativePageX < 0 || relativePageY < 0) {

				var absAreaElLeft = areaElLeft;
				var absAreaElTop = areaElTop;

				if (relativePageX < 0) {

					absAreaElLeft += relativePageX;
					areaElPageLeft += relativePageX;

				}

				if (relativePageY < 0) {

					absAreaElTop += relativePageY;
					areaElPageTop += relativePageY;

				}

				areaEl.style.transform = `translate(${absAreaElLeft}px, ${absAreaElTop}px)`;

				relativePageX = Math.abs(relativePageX);
				relativePageY = Math.abs(relativePageY);

			}

			//adjust the size of the selection area
			areaEl.style.width = `${relativePageX}px`;
			areaEl.style.height = `${relativePageY}px`;

			//deselect all previously selected nodes
			this.deselect();

			//check what nodes fall within the selection
			this.loadedFlow.nodes.forEach((node) => {

				var nodeBounding = node.element.getBoundingClientRect();
				var nodeLeftAvg = nodeBounding.left + nodeBounding.width / 2;
				var nodeTopAvg = nodeBounding.top + nodeBounding.height / 2;

				if (nodeLeftAvg > areaElPageLeft && nodeLeftAvg < areaElPageLeft + relativePageX &&
					nodeTopAvg > areaElPageTop && nodeTopAvg < areaElPageTop + relativePageY) {
					this.select(node);
				}

			});

		});

	}

	/**
	 *	This methods enables the ability of selecting items in the editor
	 */
	enableSelection() {

		//mousedown
		document.body.addEventListener('mousedown', (event) => {

			if (!this.loadedFlow) {
				return;
			}

			//drag handler
			if (event.button === 0) {

				//area selector
				if (!this.selection.length && (event.target === this.element || event.target === this.element.firstChild)) {
					this.initAreaSelector(event);
				} else if (!XibleEditor.isInputElement(event.target)) { //drag handler
					this.initDrag(event);
				}

			}

		});

		//mouseup
		document.body.addEventListener('mouseup', e => {

			if (!this.loadedFlow) {
				return;
			}

			//if a drag never started or the mouse position never changed
			if (!window.nodeDragListener || !window.nodeDragHasFired) {

				//deselect
				if ((e.target === this.element.firstChild || e.target === this.element) && !e.ctrlKey && e.button === 0) {
					this.deselect();
				}

			}

			//complete the selection after an area select
			if (window.areaMoveListener) {

				document.body.removeEventListener('mousemove', window.areaMoveListener);
				window.areaMoveListener = null;

				var areaEl = document.querySelector('.xible .area');
				if (areaEl) {
					areaEl.parentNode.removeChild(areaEl);
				}

			}

			if (!window.nodeDragListener) {
				return;
			}

			document.body.removeEventListener('mousemove', window.nodeDragListener);
			window.nodeDragListener = null;

			//splice a connector
			if (window.nodeDragSpliceConnector) {

				var selNode = this.selection[0];
				var origConnectorDestination = window.nodeDragSpliceConnector.destination;

				selNode.element.classList.remove('splice');
				window.nodeDragSpliceConnector.element.classList.remove('splice');

				//connect the connector to the first input of type of the selected node
				var selInputs = selNode.getInputsByType(window.nodeDragSpliceConnector.origin.type);
				if (!selInputs.length) {
					selInputs = selNode.getInputsByType(null);
				}
				var selInput = selInputs[0];
				window.nodeDragSpliceConnector.setDestination(selInput);

				//connect a duplicate of the connector to the first output of type of the selected node
				var dupConn = new XibleEditorConnector();
				this.loadedFlow.connectors.push(dupConn);

				var selOutputs = selNode.getOutputsByType(window.nodeDragSpliceConnector.origin.type);
				var selOutput;
				if (!selOutputs.length) {

					selOutputs = selNode.getOutputsByType(null);
					if (selOutputs.length) {
						selOutput = selOutputs[0];
					} else {

						selOutput = selNode.outputs.find(output => {
							return output.type !== 'trigger';
						});

					}

				} else {
					selOutput = selOutputs[0];
				}

				dupConn.setOrigin(selOutput);
				dupConn.setDestination(origConnectorDestination);

				this.addConnector(dupConn);

				window.nodeDragSpliceConnector = null;

			}

		});

		//key handlers
		document.body.addEventListener('keydown', (event) => {

			if (!this.loadedFlow || XibleEditor.isInputElement(event.target)) {
				return;
			}

			switch (event.key) {

				//remove selection on delete or backspace
				case 'Delete':
				case 'Backspace':

					while (this.selection.length) {
						this.selection[0].delete();
					}
					event.preventDefault();

					break;

					//select all
				case 'a':

					if (event.ctrlKey) {

						this.loadedFlow.nodes.forEach((node) => this.select(node));
						this.loadedFlow.connectors.forEach((connector) => this.select(connector));

						event.preventDefault();

					}

					break;

					//deselect all
				case 'd':

					if (event.ctrlKey) {

						this.deselect();
						event.preventDefault();

					}

					break;

					//deselect all
				case 'Escape':

					this.deselect();
					event.preventDefault();

					break;

					//duplicate layers
				case 'j':

					if (event.ctrlKey) {

						this.duplicateToEditor(this.selection);
						event.preventDefault();

					}

					break;

					//cut
				case 'x':

					if (event.ctrlKey && this.selection.length) {

						this.copySelection = this.duplicate(this.selection);
						while (this.selection.length) {
							this.selection[0].delete();
						}

						event.preventDefault();

					}

					break;

					//copy
				case 'c':

					if (event.ctrlKey && this.selection.length) {
						this.copySelection = this.duplicate(this.selection);
					}

					event.preventDefault();

					break;

					//paste
				case 'v':

					if (event.ctrlKey && this.copySelection) {

						//TODO: ensure paste is in view
						this.duplicateToEditor(this.copySelection);

						event.preventDefault();

					}

					break;

					//help
				case 'h':
				case '?':

					if (this.selection.length === 1 && this.selection[0] instanceof XibleEditorNode) {

						this.describeNode(this.selection[0]);
						event.preventDefault();

					}

					break;

					//save
				case 's':

					if (event.ctrlKey) {

						this.loadedFlow.save();
						event.preventDefault();

					}

			}

		});

	}

	/**
	 *	Duplicates the given selection in the editor
	 *	Repositions the duplicated selection by x+20px, y+20px
	 *	@param {(XibleEditorNode|XibleEditorConnector)[]}	[selection=]	the selection to duplicate
	 */
	duplicateToEditor(selection = this.selection) {

		let duplicates = this.duplicate(selection);

		duplicates.forEach((dup) => {

			if (dup instanceof XibleEditorNode) {

				//TODO: check if there's already an element at this position (within 20px radius)
				//reposition if true
				dup.setPosition(dup.left + 20, dup.top + 20);

				this.loadedFlow.addNode(dup);
				this.addNode(dup);

			} else {

				//FIXME: currently fails if a connector crosses flows
				this.loadedFlow.addConnector(dup);
				this.addConnector(dup);

			}

		});

		this.deselect();
		duplicates.forEach((dup) => this.select(dup));

	}

	/**
	 *	Duplicates the given selection and returns that duplication as an array
	 *	@param {(XibleEditorNode|XibleEditorConnector)[]}	[selection=]	the selection to duplicate
	 */
	duplicate(selection = this.selection) {

		let newSelection = [];
		let dupMap = {};

		selection.forEach((sel) => {

			if (!(sel instanceof XibleEditorNode)) {
				return;
			}

			var dup = sel.duplicate();
			dupMap[sel._id] = dup;
			newSelection.push(dup);

		});

		//make a copy of all connectors between selected nodes
		let processedOutputs = [];
		let processedConnectors = [];
		selection.forEach((sel) => {

			if (!(sel instanceof XibleEditorNode)) {
				return;
			}

			sel.getOutputs().forEach((output) => {

				if (processedOutputs.indexOf(output._id) > -1) {
					return;
				}
				processedOutputs.push(output._id);

				output.connectors.forEach((conn) => {

					if (dupMap[conn.destination.node._id]) {

						processedConnectors.push(`${conn.origin._id},${conn.destination._id}`);

						let dupConn = new XibleEditorConnector({
							origin: dupMap[sel._id].getOutputByName(output.name),
							destination: dupMap[conn.destination.node._id].getInputByName(conn.destination.name)
						});
						newSelection.push(dupConn);

					}

				});

			});

		});
		processedOutputs = null;

		//make a copy of all connectors with only one side connected in the selection
		selection.forEach((conn) => {

			if (!(conn instanceof XibleEditorConnector)) {
				return;
			}

			if (processedConnectors.indexOf(`${conn.origin._id},${conn.destination._id}`) > -1) {
				return;
			}

			let origNode = dupMap[conn.origin.node._id];
			let destNode = dupMap[conn.destination.node._id];
			if (!origNode || !destNode) {

				let dupConn = new XibleEditorConnector({
					origin: origNode ? origNode.getOutputByName(conn.origin.name) : conn.origin,
					destination: destNode ? destNode.getInputByName(conn.destination.name) : conn.destination
				});
				newSelection.push(dupConn);

			}

		});

		return newSelection;

	}

	/**
	 *	Enables zooming using the scrollwheel in the editor
	 */
	enableZoom() {

		this.zoom = 1;

		//trigger zoom from scrollwheel
		this.element.addEventListener('wheel', (event) => {

			//prevent default browser action; scroll
			event.preventDefault();

			//find the current cursor position, relative against the actions, but no transform (translate/zoom) applied
			var mouseLeft = event.pageX - this.getOffsetPosition().left;
			var mouseTop = event.pageY - this.getOffsetPosition().top;

			//find the current cursor position, relative against the actions, but now with transform (translate/zoom) applied
			var relativeMouseLeft = (mouseLeft - this.left) / this.zoom;
			var relativeMouseTop = (mouseTop - this.top) / this.zoom;

			//in or out
			if (event.deltaY > 0 && this.zoom >= 0.5) {
				this.zoom -= 0.1;
			} else if (event.deltaY < 0 && this.zoom < 5) {
				this.zoom += 0.1;
			}

			//update left/top based on cursor position
			this.left = relativeMouseLeft - (this.zoom * relativeMouseLeft) + mouseLeft - relativeMouseLeft;
			this.top = relativeMouseTop - (this.zoom * relativeMouseTop) + mouseTop - relativeMouseTop;

			//apply the zoom transformation
			this.transform();

		});

	}

	/**
	 *	Enables panning by holding down the scrollwheel
	 */
	enablePan() {

		this.top = this.left = this.backgroundLeft = this.backgroundTop = 0;

		var mousePanFunction;
		this.element.addEventListener('mousedown', (event) => {

			if (event.button === 1) {

				//initial values based on current position
				var initPageX = event.pageX;
				var initPageY = event.pageY;
				var initLeft = this.left;
				var initTop = this.top;
				var initBackgroundLeft = this.backgroundLeft;
				var initBackgroundTop = this.backgroundTop;

				this.element.classList.add('panning');

				//catch the mousemove event
				document.body.addEventListener('mousemove', mousePanFunction = (event) => {

					//check how much we moved since the initial mousedown event
					var relativePageX = event.pageX - initPageX;
					var relativePageY = event.pageY - initPageY;

					//save the new position
					this.left = initLeft + relativePageX;
					this.top = initTop + relativePageY;

					//apply pan to background position as well
					this.backgroundLeft = initBackgroundLeft + (event.pageX - initPageX);
					this.backgroundTop = initBackgroundTop + (event.pageY - initPageY);

					this.transform();

				});

				event.preventDefault();

			}

		});


		//unhook eventhandler created on mousedown
		document.body.addEventListener('mouseup', (event) => {

			if (mousePanFunction) {

				document.body.removeEventListener('mousemove', mousePanFunction);
				mousePanFunction = null;

				this.element.classList.remove('panning');

			}

		});

	}

	//enable hooking of connectors
	enableHook() {

		//triggered when shuffling completes
		document.body.addEventListener('mouseup', (event) => {

			if (!window.dummyXibleConnectors || !window.dummyXibleNode) {
				return;
			}

			//destroy the temporary connector & dummyXibleNode
			window.dummyXibleNode.delete();
			window.dummyXibleConnectors.forEach((conn) => conn.delete());
			window.dummyXibleConnectors = window.dummyXibleNode = window.dummyIo = null;

			//ensure we deselect the dummyXibleNode
			this.deselect();

		});

	}

	static get inputElementNameList() {
		return ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA'];
	}

	static isInputElement(el) {

		if (!el) {
			return true;
		}

		return el.classList.contains('content') || this.inputElementNameList.indexOf(el.nodeName) > -1;

	}

}
