function XibleEditor() {

	this.element = document.createElement('div');
	this.element.classList.add('xible');
	this.element.appendChild(document.createElement('div'));
	this.element.firstChild.classList.add('editor');
	this.element.firstChild.style.transformOrigin = '0 0';

	this.selection = [];
	this.flows = {};
	this.loadedFlow = null;

	this.enableInsertNode();
	this.enableZoom();
	this.enablePan();
	this.enableHook();
	this.enableSelection();
	this.initConsole();

}


XibleEditor.prototype.describeNode = function(node) {

	if (!(node instanceof XibleNode)) {
		throw new Error(`1st argument must be a XibleNode`);
	}

	node = node.duplicate(true);

	node.emit('beforeAppend');

	let describeEl = this.element.appendChild(document.createElement('div'));
	describeEl.classList.add('describe');

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

	//hide the describe element onclick
	describeEl.onmousedown = (event) => {
		this.element.removeChild(describeEl);
	};

};


XibleEditor.prototype.enableInsertNode = function() {

	let div = document.body.appendChild(document.createElement('div'));
	div.setAttribute('id', 'nodeSelector');
	div.classList.add('hidden');

	//this list will be populated with the local installed nodes
	let localUl = document.createElement('ul');

	//this list will be populated with the online nodes
	//let onlineUl = document.createElement('ul');

	let filterInput = div.appendChild(document.createElement('input'));
	filterInput.setAttribute('type', 'text');
	filterInput.setAttribute('placeholder', 'filter nodes');
	filterInput.addEventListener('input', (event) => {

		let noResults = true;
		localUl.querySelectorAll('li').forEach((li) => {

			let vals = filterInput.value.replace(/[\W_]+/g, ' ').toLowerCase().split(' ');
			let textContent = li.textContent.toLowerCase();

			if (!filterInput.value || vals.every((val) => textContent.indexOf(val) > -1)) {

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
	//div.appendChild(onlineUl);

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
			node = this.appendNode(new XibleNode(node));
			this.loadedFlow.nodes.push(node);
			node.setPosition(((event.pageX - actionsOffset.left - this.left) / this.zoom) - (node.element.firstChild.offsetWidth / 2), ((event.pageY - actionsOffset.top - this.top) / this.zoom) - (node.element.firstChild.offsetHeight / 2));
			this.deselect();
			this.select(node);
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

		let req = new OoHttpRequest('GET', 'https://10.0.0.20:9600/api/nodes/online');
		req.toObject(Object).then((nodes) => {

			let nodeNames = Object.keys(nodes);
			nodeNames.forEach((nodeName) => {

				let li = buildNode(nodeName, nodes[nodeName]);
				li.classList.add('online');
				li.onclick = (event) => {

					if (window.confirm('Download and install this node?')) {

						li.classList.add('downloading');

						window.setTimeout(() => {

							li.onclick = null;
							li.classList.remove('downloading', 'online');
							hookNode(li, nodes[nodeName]);

						}, 1000);
					}

				};
				localUl.appendChild(li);

			});

			if (nodeNames.length) {
				div.classList.remove('noresults');
			} else {
				div.classList.add('noresults');
			}

		});

	});

	//get the installed nodes
	let req = new OoHttpRequest('GET', 'https://10.0.0.20:9600/api/nodes');
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

		if (!div.classList.contains('hidden') && !div.contains(event.target)) {
			div.classList.add('hidden');
		}

	});

};


XibleEditor.prototype.initConsole = function() {

	window.setTimeout(() => {

		this.console = document.getElementById('console');

		if (!this.console) {
			return;
		}

		this.initStats();

	}, 1000);

};


XibleEditor.prototype.setGlobalFromOutput = function(flow, output) {

	flow.nodes.forEach((node) => {

		node.getInputs().forEach((input) => {

			if (input.type === output.type && !input.connectors.length) {
				input.setGlobal(output.global);
			}

		});

	});

};


XibleEditor.prototype.getFlows = function() {

	return new Promise((resolve, reject) => {

		let req = new OoHttpRequest('GET', 'https://10.0.0.20:9600/api/flows');

		req.toObject(Object).then((flows) => {

			Object.keys(flows).forEach((flowId) => {

				let flow = new XibleFlow(flows[flowId]);
				this.flows[flowId] = flow;

				//set global appropriately when it's changed
				flow.on('global', (output) => this.setGlobalFromOutput(flow, output));

			});

			resolve(this.flows);

		});

	});

};


const CHART_MAX_TICKS = 60;


XibleEditor.prototype.initStats = function() {

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
						fontColor: '#74808f',
						mirror: true,
						callback: (value) => value + ' μs'
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
						fontColor: '#74808f',
						mirror: true,
						callback: (value) => value + ' %'
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
						fontColor: '#74808f',
						mirror: true,
						callback: (value) => value + ' MiB'
					}
				}]
			}
		}
	});

};


XibleEditor.prototype.webSocketMessageHandler = function(json) {

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
			XibleFlow.emit('stopped', this.flows[json.flowId]);
			break;

		case 'xible.flow.stopping':

			this.flows[json.flowId].emit('stopping');
			XibleFlow.emit('stopping', this.flows[json.flowId]);
			break;

		case 'xible.flow.starting':

			this.flows[json.flowId].emit('starting');
			XibleFlow.emit('starting', this.flows[json.flowId]);
			break;

		case 'xible.flow.started':

			this.flows[json.flowId].emit('started');
			XibleFlow.emit('started', this.flows[json.flowId]);
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

};


XibleEditor.prototype.initWebSocket = function(socket) {

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

};


XibleEditor.prototype.getFlowById = function(id) {
	return this.flows.find((flow) => flow._id === id);
};


XibleEditor.prototype.appendNode = function(node) {

	node.emit('beforeAppend');

	this.element.firstChild.appendChild(node.element);


	if (!node._id) {
		node._id = XibleEditor.generateObjectId();
	}

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

};


XibleEditor.prototype.appendConnector = function(connector) {

	connector.editor = this;
	this.element.firstChild.appendChild(connector.element);
	connector.draw();

	return connector;

};


//remove a child
//can be either an XibleNode, XibleConnector
XibleEditor.prototype.removeChild = function(obj) {

	//remove from loadedFlow
	var index;
	if (obj instanceof XibleNode && (index = this.loadedFlow.nodes.indexOf(obj)) > -1) {
		this.loadedFlow.nodes.splice(index, 1);
	} else if (obj instanceof XibleConnector && (index = this.loadedFlow.connectors.indexOf(obj)) > -1) {
		this.loadedFlow.connectors.splice(index, 1);
	}

	//remove from selection
	let selectionIndex = this.selection.indexOf(obj);
	if (selectionIndex > -1) {
		this.selection.splice(selectionIndex, 1);
	}


	obj.editor = null;

	//remove from dom
	if (obj.element && obj.element.parentNode) {
		this.element.firstChild.removeChild(obj.element);
	}

};


XibleEditor.prototype.viewFlow = function(flow) {

	if (!(flow instanceof XibleFlow)) {
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
		this.appendNode(node);
	});

	//setup the connectors
	flow.connectors.forEach((connector) => {
		this.appendConnector(connector);
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

};


//returns the non-transformed offset position
XibleEditor.prototype.getOffsetPosition = function() {

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

};


//transforms the element according to the object properties
XibleEditor.prototype.transform = function() {

	this.element.firstChild.style.transform = 'translate(' + this.left + 'px, ' + this.top + 'px) scale(' + this.zoom + ')';
	this.element.style.backgroundPosition = this.backgroundLeft + 'px ' + this.backgroundTop + 'px';

};


//deselect complete selection
XibleEditor.prototype.deselect = function(obj) {

	if (obj) {

		let selectionIndex = this.selection.indexOf(obj);
		if (selectionIndex > -1) {

			this.selection.splice(selectionIndex, 1);
			obj.element.classList.remove('selected');

		}

	} else {

		this.selection.forEach(sel => sel.element.classList.remove('selected'));
		this.selection = [];

	}

};


XibleEditor.prototype.toggleSelectionOnMouseEvent = function(e, obj) {

	if (e.button === 1) {
		return;
	}

	let selectionIndex = this.selection.indexOf(obj);

	if (!e.ctrlKey && e.type === 'mousedown' && selectionIndex === -1) {

		this.deselect();
		this.selection.push(obj);
		obj.element.classList.add('selected');

	} else if (e.ctrlKey && e.type === 'mouseup' && selectionIndex === -1 && !window.nodeDragHasFired) {

		this.selection.push(obj);
		obj.element.classList.add('selected');

	} else if (!e.ctrlKey && e.type === 'mouseup' && selectionIndex > -1 && !window.nodeDragHasFired) {

		this.deselect();
		this.selection.push(obj);
		obj.element.classList.add('selected');

	} else if (e.ctrlKey && e.type === 'mouseup' && selectionIndex > -1 && !window.nodeDragHasFired) {
		this.deselect(obj);
	}

	/*

	if(e.ctrlKey && e.type === 'mouseup' && selectionIndex > -1 && window.nodeDragHasFired)
		duplicate (onmousemove already)
		selection to duplicates

	if(e.ctrlKey && e.type === 'mouseup' && selectionIndex === -1 && window.nodeDragHasFired)
		select (onmousemove already)
		duplicate (onmousemove already)
		selection to duplicates

	*/

};


//add to selection
XibleEditor.prototype.select = function(obj) {

	let selectionIndex = this.selection.indexOf(obj);

	if (selectionIndex == -1) {

		this.selection.push(obj);
		obj.element.classList.add('selected');

	}

};


//inits a drag of the selection (after mousedown)
XibleEditor.prototype.initDrag = function(e) {

	//exit if we're already dragging
	if (window.nodeDragListener || !this.selection.length) {
		return;
	}

	//init the start positions of the drag
	let initPageX = e.pageX;
	let initPageY = e.pageY;
	window.nodeDragHasFired = false;

	//get all the connectors for the selected node
	//so we can check if we are not splicing a connector for the selected node
	//because that wouldn't make sense
	let selNodeConnectors = [];
	let selNode;
	if (this.selection.length === 1 && this.selection[0] instanceof XibleNode) {

		selNode = this.selection[0];

		selNode.getInputs().concat(selNode.getOutputs()).forEach((io) => {
			selNodeConnectors.push(...io.connectors);
		});

	}

	//catch the mousemove event
	document.body.addEventListener('mousemove', window.nodeDragListener = (event) => {

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
		if (this.selection.length === 1 && this.selection[0] instanceof XibleNode) {

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

};


XibleEditor.prototype.initAreaSelector = function(e) {

	//exit if we're already dragging
	if (window.areaMoveListener) {
		return;
	}

	//init the start positions of the drag
	var initPageX = e.pageX;
	var initPageY = e.pageY;

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

};


//enable selection handlers
XibleEditor.prototype.enableSelection = function() {

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
			var dupConn = new XibleConnector();
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

			this.appendConnector(dupConn);

			window.nodeDragSpliceConnector = null;

		}

	});

	//key handlers
	document.body.addEventListener('keydown', (event) => {

		if (!this.loadedFlow) {
			return;
		}

		if (!XibleEditor.isInputElement(event.target)) {

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

						this.duplicateSelection();
						event.preventDefault();

					}

					break;

					//help
				case 'h':
				case '?':

					if (this.selection.length === 1 && this.selection[0] instanceof XibleNode) {

						this.describeNode(this.selection[0]);
						event.preventDefault();

					}

					break;

			}

		}

	});

};


XibleEditor.prototype.duplicateSelection = function() {

	let newSelection = [];
	let dupMap = {};

	this.selection.forEach((sel) => {

		if (!(sel instanceof XibleNode)) {
			return;
		}

		var dup = sel.duplicate();
		dupMap[sel._id] = dup;
		dup.setPosition(dup.left + 20, dup.top + 20);
		newSelection.push(dup);
		this.loadedFlow.nodes.push(dup);
		this.appendNode(dup);

	});

	//make a copy of all connectors between selected nodes
	let processedOutputs = [];
	let processedConnectors = [];
	this.selection.forEach((sel) => {

		if (!(sel instanceof XibleNode)) {
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

					let dupConn = new XibleConnector({
						origin: dupMap[sel._id].getOutputByName(output.name),
						destination: dupMap[conn.destination.node._id].getInputByName(conn.destination.name)
					});
					newSelection.push(dupConn);
					this.loadedFlow.connectors.push(dupConn);
					this.appendConnector(dupConn);

				}

			});

		});

	});
	processedOutputs = null;

	//make a copy of all connectors with only one side connected in the selection
	this.selection.forEach((conn) => {

		if (!(conn instanceof XibleConnector)) {
			return;
		}

		if (processedConnectors.indexOf(`${conn.origin._id},${conn.destination._id}`) > -1) {
			return;
		}

		let origNode = dupMap[conn.origin.node._id];
		let destNode = dupMap[conn.destination.node._id];
		if (!origNode || !destNode) {

			let dupConn = new XibleConnector({
				origin: origNode ? origNode.getOutputByName(conn.origin.name) : conn.origin,
				destination: destNode ? destNode.getInputByName(conn.destination.name) : conn.destination
			});
			newSelection.push(dupConn);
			this.loadedFlow.connectors.push(dupConn);
			this.appendConnector(dupConn);

		}

	});

	//change selection to duplicated items
	this.deselect();
	newSelection.forEach(sel => this.select(sel));
	newSelection = null;

};


//enable zooming in the editor
XibleEditor.prototype.enableZoom = function() {

	this.zoom = 1;

	//trigger zoom from scrollwheel
	this.element.addEventListener('wheel', e => {

		//prevent default browser action; scroll
		e.preventDefault();

		//find the current cursor position, relative against the actions, but no transform (translate/zoom) applied
		var mouseLeft = e.pageX - this.getOffsetPosition().left;
		var mouseTop = e.pageY - this.getOffsetPosition().top;

		//find the current cursor position, relative against the actions, but now with transform (translate/zoom) applied
		var relativeMouseLeft = (mouseLeft - this.left) / this.zoom;
		var relativeMouseTop = (mouseTop - this.top) / this.zoom;

		//in or out
		if (e.deltaY > 0 && this.zoom >= 0.5) {
			this.zoom -= 0.1;
		} else if (e.deltaY < 0 && this.zoom < 5) {
			this.zoom += 0.1;
		}

		//update left/top based on cursor position
		this.left = relativeMouseLeft - (this.zoom * relativeMouseLeft) + mouseLeft - relativeMouseLeft;
		this.top = relativeMouseTop - (this.zoom * relativeMouseTop) + mouseTop - relativeMouseTop;

		//apply the zoom transformation
		this.transform();

	});

};


XibleEditor.prototype.enablePan = function() {

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

};


//enable hooking of connectors
XibleEditor.prototype.enableHook = function() {

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

};


XibleEditor.generateObjectId = function() {

	function s4() {
		return Math.floor((1 + Math.random()) * 0x10000)
			.toString(16)
			.substring(1);
	}
	return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
		s4() + '-' + s4() + s4() + s4();

};


XibleEditor.inputElementNameList = ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA'];


XibleEditor.isInputElement = function(el) {

	if (!el) {
		return true;
	}

	return el.classList.contains('content') || this.inputElementNameList.indexOf(el.nodeName) > -1;

};


function XibleFlow() {
	this.init.apply(this, arguments);
}


XibleEditor.Flow = XibleEditor.prototype.Flow = XibleFlow;


Object.assign(XibleFlow, EventEmitter.prototype);
EventEmitter.call(XibleFlow);
Object.assign(XibleFlow.prototype, EventEmitter.prototype);


XibleFlow.prototype.init = function(obj) {

	EventEmitter.call(this);
	this._id = null;
	this.nodes = [];
	this.connectors = [];
	this.runnable = true;
	this.running = false;
	this.viewState = {
		left: obj && obj.viewState && obj.viewState.left ? obj.viewState.left : 0,
		top: obj && obj.viewState && obj.viewState.top ? obj.viewState.top : 0,
		zoom: obj && obj.viewState && obj.viewState.zoom ? obj.viewState.zoom : 1,
		backgroundLeft: obj && obj.viewState && obj.viewState.backgroundLeft ? obj.viewState.backgroundLeft : 0,
		backgroundTop: obj && obj.viewState && obj.viewState.backgroundTop ? obj.viewState.backgroundTop : 0
	};

	//obj assign after this
	if (!obj) {
		return;
	}

	if (obj._id) {
		this._id = obj._id;
	}

	if (obj.running) {
		this.running = true;
	}

	//setup the nodes
	if (obj.nodes) {

		obj.nodes.forEach((node) => {
			this.addNode(new XibleNode(node));
		});

	}

	//setup the connectors
	if (obj.connectors) {

		obj.connectors.forEach((connector) => {

			connector.origin = this.getOutputById(connector.origin);
			connector.destination = this.getInputById(connector.destination);

			this.connectors.push(new XibleConnector(connector));

		});

	}

	if (typeof obj.runnable === 'boolean') {
		this.runnable = obj.runnable;
	}

};


XibleFlow.prototype.addNode = function(node) {

	node.flow = this;
	this.nodes.push(node);

};


XibleFlow.prototype.getNodeById = function(id) {
	return this.nodes.find((node) => node._id === id);
};


XibleFlow.prototype.getInputById = function(id) {

	for (let i = 0; i < this.nodes.length; ++i) {

		let node = this.nodes[i];
		for (let name in node.inputs) {

			if (node.inputs[name]._id === id) {
				return node.inputs[name];
			}

		}

	}

};


XibleFlow.prototype.getOutputById = function(id) {

	for (let i = 0; i < this.nodes.length; ++i) {

		let node = this.nodes[i];
		for (let name in node.outputs) {

			if (node.outputs[name]._id === id) {
				return node.outputs[name];
			}

		}

	}

};


XibleFlow.prototype.start = function() {

	if (!this._id) {
		return;
	}

	this.undirect();

	let req = new OoHttpRequest('PATCH', 'https://10.0.0.20:9600/api/flows/' + this._id + '/start');
	req.send();

};


XibleFlow.prototype.stop = function() {

	if (!this._id) {
		return;
	}

	this.undirect();

	let req = new OoHttpRequest('PATCH', 'https://10.0.0.20:9600/api/flows/' + this._id + '/stop');
	req.send();

};


XibleFlow.prototype.delete = function() {

	if (!this._id) {
		return;
	}

	let req = new OoHttpRequest('DELETE', 'https://10.0.0.20:9600/api/flows/' + this._id);
	req.send();

};


XibleFlow.prototype.save = function() {

	this.undirect();

	return new Promise((resolve, reject) => {

		let json = this.toJson();
		let req;

		if (!this._id) {
			req = new OoHttpRequest('POST', 'https://10.0.0.20:9600/api/flows');
		} else {
			req = new OoHttpRequest('PUT', 'https://10.0.0.20:9600/api/flows/' + this._id);
		}

		req.toObject(Object, json).then((obj) => {

			this._id = obj._id;
			resolve(this);

		});

	});

};


XibleFlow.prototype.undirect = function() {

	this.nodes
		.forEach((node) => {

			node.element.classList.remove('nodirect');

			if (node._directSetDataListener) {

				node.removeListener('setdata', node._directSetDataListener);
				delete node._directSetDataListener;

			}

		});

	this.connectors
		.forEach((connector) => {
			connector.element.classList.remove('nodirect');
		});

};


XibleFlow.prototype.direct = function(related) {

	//throttle
	if (this._lastPostDirectFunction || this._lastDirectPromise) {

		let hasFunction = !!this._lastPostDirectFunction;

		this._lastPostDirectFunction = () => {

			this.direct(related);
			this._lastPostDirectFunction = null;

		};

		if (!hasFunction) {
			this._lastDirectPromise.then(this._lastPostDirectFunction);
		}

		return;

	}

	//ensure this flow is saved first
	if (!this._id) {
		return this.save().then(() => this.direct(related));
	}

	if (!related) {
		return Promise.reject(`related argument missing`);
	}

	this._lastDirectPromise = new Promise((resolve, reject) => {

		let nodes = related.nodes.map((node) => {
			return {
				_id: node._id,
				data: node.data
			};
		});

		let req = new OoHttpRequest('PATCH', `https://10.0.0.20:9600/api/flows/${this._id}/direct`);
		req.toString(nodes).then((json) => {

			resolve(this);
			this._lastDirectPromise = null;

		});

	});

	return this._lastDirectPromise;

};


XibleFlow.prototype.toJson = function(nodes, connectors) {

	//the nodes
	const nodeWhitelist = ['_id', 'name', 'type', 'left', 'top', 'inputs', 'outputs', 'hidden', 'global'];
	var dataObject, inputsObject, outputsObject;
	var nodeJson = JSON.stringify(nodes || this.nodes, function(key, value) {

		switch (key) {

			case 'inputs':

				inputsObject = value;
				return value;

			case 'outputs':

				outputsObject = value;
				return value;

			case 'data':

				dataObject = value;
				return value;

			default:

				if (this !== inputsObject && this !== outputsObject && this !== dataObject && key && isNaN(key) && nodeWhitelist.indexOf(key) === -1) {
					return;
				} else {
					return value;
				}

		}

	});

	//the connectors
	const CONNECTOR_WHITE_LIST = ['_id', 'origin', 'destination', 'type', 'hidden'];
	var connectorJson = JSON.stringify(connectors || this.connectors, function(key, value) {

		if (key && isNaN(key) && CONNECTOR_WHITE_LIST.indexOf(key) === -1) {
			return;
		} else if (value && (key === 'origin' || key === 'destination')) {
			return value._id;
		} else {
			return value;
		}

	});

	//the viewstate
	this.viewState = {
		left: this.editor.left,
		top: this.editor.top,
		zoom: this.editor.zoom,
		backgroundLeft: this.editor.backgroundLeft,
		backgroundTop: this.editor.backgroundTop
	};

	return '{"nodes":' + nodeJson + ',"connectors":' + connectorJson + ',"viewState":' + JSON.stringify(this.viewState) + '}';

};


XibleFlow.prototype.removeAllStatuses = function() {
	this.nodes.forEach((node) => {
		node.removeAllStatuses();
	});
};


function XibleNode() {
	this.init.apply(this, arguments);
}


XibleEditor.Node = XibleEditor.prototype.Node = XibleNode;


//inherit
Object.assign(XibleNode.prototype, EventEmitter.prototype);

//init
XibleNode.prototype.init = function(obj = {}, ignoreData = false) {

	this.element = document.createElement('div');
	EventEmitter.call(this);
	this.element.classList.add('node');

	this.nodeExists = obj.nodeExists;
	if (!obj.nodeExists) {

		this.element.classList.add('fail');
		this.addStatus({
			_id: 1,
			color: 'red',
			message: `This node does not exist in this configuration`
		});

	}

	this._id = obj._id;
	this.type = obj.type;
	this.hostsEditorContent = obj.hostsEditorContent;
	this.groups = obj.groups || [];

	//copy data
	if (obj.data && !ignoreData) {
		this.data = Object.assign({}, obj.data);
	} else {
		this.data = {};
	}

	//set header
	this.name = obj.name;
	let headerEl = this.element.appendChild(document.createElement('h1'));
	headerEl.appendChild(document.createTextNode(this.name));

	//add ios
	var ios = this.element.appendChild(document.createElement('div'));
	ios.classList.add('io');

	//add input list
	var inputList = this.inputList = ios.appendChild(document.createElement('ul'));
	inputList.classList.add('input');

	//add output list
	var outputList = this.outputList = ios.appendChild(document.createElement('ul'));
	outputList.classList.add('output');

	//init position
	this.setPosition(obj.left, obj.top);

	//add inputs
	this.inputs = {};
	if (obj.inputs) {
		for (let name in obj.inputs) {
			this.appendChild(new XibleNodeInput(name, obj.inputs[name]));
		}
	}

	//add outputs
	this.outputs = {};
	if (obj.outputs) {
		for (let name in obj.outputs) {
			this.appendChild(new XibleNodeOutput(name, obj.outputs[name]));
		}
	}

	//add additional content
	if (this.hostsEditorContent) { //load editor static hosted content for this node
		this.getAndProcessEditorContent();
	} else if (!this.nodeExists && obj.editorContent) {
		this.processEditorContent(obj.editorContent);
	}

	this.statusTimeouts = {};

	//selection handlers
	this.element.addEventListener('mousedown', (event) => {
		if (this.editor) {
			this.editor.toggleSelectionOnMouseEvent(event, this);
		}
	});
	this.element.addEventListener('mouseup', (event) => {
		if (this.editor) {
			this.editor.toggleSelectionOnMouseEvent(event, this);
		}
	});

	if (typeof obj.description === 'string') {
		this.description = obj.description;
	}

	//direct handler
	headerEl.addEventListener('dblclick', (event) => {

		if (!this.editor || this.type !== 'action') {
			return;
		}

		this.editor.loadedFlow.undirect();

		//fetch all related connectors and nodes for the double clicked node
		let related = XibleNode.getAllInputObjectNodes(this);

		//don't forget about globals
		related.nodes = related.nodes.concat(this.getAllGlobals());

		related.nodes.forEach((node) => {

			node._directSetDataListener = () => this.editor.loadedFlow.direct(related);
			node.on('setdata', node._directSetDataListener);

		});

		this.editor.loadedFlow.nodes
			.filter((node) => related.nodes.indexOf(node) === -1)
			.forEach((node) => {
				node.element.classList.add('nodirect');
			});

		this.editor.loadedFlow.connectors
			.filter((connector) => related.connectors.indexOf(connector) === -1)
			.forEach((connector) => {
				connector.element.classList.add('nodirect');
			});

		this.editor.loadedFlow.direct(related);

	});

};


//TODO: hook this up to XibleFlow where it belongs
XibleNode.prototype.getAllGlobals = function() {

	return this.editor.loadedFlow.nodes.filter((node) => {
		return node.getOutputs().some((output) => output.global);
	});

};


XibleNode.getAllInputObjectNodes = function(node) {

	let resultNodes = [node];
	let resultConnectors = [];

	let objectInputs = node.getInputs().filter((input) => input.type !== 'trigger');

	let inputObjectNodes = [];
	objectInputs.forEach((objectInput) => {

		resultConnectors.push(...objectInput.connectors);
		objectInput.connectors.forEach((connector) => {

			let objs = XibleNode.getAllInputObjectNodes(connector.origin.node);
			resultNodes.push(...objs.nodes);
			resultConnectors.push(...objs.connectors);

		});

	});

	return {
		'nodes': resultNodes,
		'connectors': resultConnectors
	};

};


XibleNode.prototype.setData = function(attr, value) {

	if (typeof value === 'undefined') {
		Object.assign(this.data, attr);
	} else {
		this.data[attr] = value;
	}

	this.emit('setdata', attr, value);
	return this;

};


XibleNode.prototype.getData = function(attr) {
	return this.data[attr];
};


XibleNode.prototype.getAndProcessEditorContent = function() {

	let proc = () => {

		let req = new XMLHttpRequest();
		req.open('GET', `https://10.0.0.20:9600/api/nodes/${this.name}/editor/index.htm`);
		req.onload = () => {
			this.processEditorContent(req.responseText);
		};
		req.send();

	};

	if (this.parentNode) {
		proc();
	} else {
		this.once('beforeAppend', proc);
	}

};


XibleNode.prototype.processEditorContent = function(content) {

	this.editorContent = content;

	let proc = () => {

		let div = document.createElement('div');
		div.classList.add('content');
		let shadow;
		if (typeof div.attachShadow === 'function') {
			shadow = div.attachShadow({
				mode: 'open'
			});
		} else {
			shadow = div.createShadowRoot();
		}
		shadow.innerHTML = `<style>@import url("css/nodeContent.css");</style>${this.editorContent}`;

		//hook an eventlistener to check if the style element has loaded
		let styleEl = shadow.querySelector('style');
		let stylesLoaded = false;
		let scriptsLoaded = false;
		let emittedLoad = false;
		styleEl.onload = function() {

			stylesLoaded = true;
			checkForEmitLoad();

		};

		//emit a load event
		let checkForEmitLoad = () => {

			if (!emittedLoad && stylesLoaded && scriptsLoaded) {

				this.emit('editorContentLoad');
				emittedLoad = true;

			}

		};

		//append the div & shadowroot to the node
		this.element.appendChild(div);
		this.editorContentEl = shadow;

		//trigger some convenience stuff
		this.convenienceLabel();
		this.convenienceHideIfAttached();
		this.convenienceOutputValue();

		//run script elements
		let scriptEls = Array.from(shadow.querySelectorAll('script')).forEach((scriptEl) => {
			new Function('window', 'document', scriptEl.textContent).call(this, null, shadow); // jshint ignore:line
		});

		scriptsLoaded = true;
		checkForEmitLoad();

	};

	if (this.editor) {
		proc();
	} else {
		this.once('beforeAppend', proc);
	}

};


//change position
XibleNode.prototype.setPosition = function(left, top) {

	this.left = left || 0;
	this.top = top || 0;
	this.element.style.transform = 'translate(' + this.left + 'px, ' + this.top + 'px)';

	//event
	this.emit('position', this);

};


//duplicates this node
XibleNode.prototype.duplicate = function(ignoreData) {

	var duplicateXibleNode = new XibleNode(this, ignoreData);

	//create a unique id for the node
	duplicateXibleNode._id = XibleEditor.generateObjectId();

	//create a unique id for the inputs
	for (let name in duplicateXibleNode.inputs) {
		duplicateXibleNode.inputs[name]._id = XibleEditor.generateObjectId();
	}

	//create a unique id for the outputs
	for (let name in duplicateXibleNode.outputs) {
		duplicateXibleNode.outputs[name]._id = XibleEditor.generateObjectId();
	}

	return duplicateXibleNode;

};


//adds an actionInput or actionOutput to this action
XibleNode.prototype.appendChild = function(child) {

	if (child instanceof XibleNodeIo) {

		if (!child._id) {
			child._id = XibleEditor.generateObjectId();
		}

		if (child instanceof XibleNodeInput) {

			this.inputList.appendChild(child.element);
			this.inputs[child.name] = child;

		} else {

			this.outputList.appendChild(child.element);
			this.outputs[child.name] = child;

		}

		child.parentNode = child.node = this;
		return child;

	}

};


XibleNode.prototype.removeChild = function(child) {

	if (child instanceof XibleNodeIo) {

		if (child instanceof XibleNodeInput) {

			this.inputList.removeChild(child.element);
			delete this.inputs[child.name];

		} else {

			this.outputList.removeChild(child.element);
			delete this.outputs[child.name];

		}

		child.parentNode = child.node = null;

		return child;

	}

};


//deletes the action
//unhooks all connectors to any inputs/outputs
XibleNode.prototype.delete = function() {

	for (let name in this.inputs) {
		this.inputs[name].delete();
	}

	for (let name in this.outputs) {
		this.outputs[name].delete();
	}

	if (this.editor) {
		this.editor.removeChild(this);
	}

};


XibleNode.prototype.addProgressBar = function(status) {

	if (!status || !status._id) {
		return;
	}

	let ul = this.statusEl;
	if (!ul) {

		ul = this.statusEl = this.element.appendChild(document.createElement('ul'));
		ul.classList.add('statuses');

	}

	let li = ul.appendChild(document.createElement('li'));
	li.setAttribute('data-statusid', status._id);
	li.classList.add('bar');

	if (status.message) {
		li.appendChild(document.createTextNode(status.message));
	}

	let statusBarHolder = li.appendChild(document.createElement('div'));
	statusBarHolder.classList.add('holder');
	statusBarHolder.appendChild(document.createElement('div'));

	if (status.timeout) {
		this.statusTimeouts[status._id] = window.setTimeout(() => {
			this.removeStatusById(status._id);
		}, status.timeout);
	}

	this.updateProgressBarById(status._id, status);

};


XibleNode.prototype.updateProgressBarById = function(statusId, status) {

	if (!this.statusEl || !statusId || !status || typeof status.percentage !== 'number') {
		return;
	}

	let li = this.statusEl.querySelector('li.bar[data-statusid="' + statusId + '"]');
	if (li) {

		let bar = li.querySelector('.holder>div');
		bar.style.transition = 'none';
		bar.style.width = `${status.percentage}%`;

		if (status.updateOverTime) {

			bar.offsetWidth; /* jshint ignore: line */
			bar.style.transition = `width ${status.updateOverTime}ms linear`;
			bar.style.width = '100%';

		}
	}

};


XibleNode.prototype.addStatus = function(status) {

	if (!status || !status._id) {
		return;
	}

	var ul = this.statusEl;
	if (!ul) {

		ul = this.statusEl = this.element.appendChild(document.createElement('ul'));
		ul.classList.add('statuses');

	}

	var li = ul.appendChild(document.createElement('li'));
	li.setAttribute('data-statusid', status._id);

	if (status.color) {
		li.classList.add(status.color);
	}

	if (status.message) {
		li.appendChild(document.createTextNode(status.message));
	}

	if (status.timeout) {
		this.statusTimeouts[status._id] = window.setTimeout(() => {
			this.removeStatusById(status._id);
		}, status.timeout);
	}

};


XibleNode.prototype.removeStatusById = function(statusId, timeout) {

	//clear timeout
	if (this.statusTimeouts[statusId]) {

		window.clearTimeout(this.statusTimeouts[statusId]);
		this.statusTimeouts[statusId] = null;
		delete this.statusTimeouts[statusId];

	}

	//get and delete li
	if (this.statusEl) {

		let li = this.statusEl.querySelector('li[data-statusid="' + statusId + '"]');
		if (li) {

			let fn = () => {
				if (this.statusEl) {
					this.statusEl.removeChild(li);
				}
			};

			if (timeout) {
				window.setTimeout(fn, timeout);
			} else {
				fn();
			}

		}

	}

};


XibleNode.prototype.removeAllStatuses = function() {

	//clear all timeouts
	for (var statusId in this.statusTimeouts) {

		window.clearTimeout(this.statusTimeouts[statusId]);
		this.statusTimeouts[statusId] = null;
		delete this.statusTimeouts[statusId];

	}

	//destroy the el
	if (this.statusEl) {

		this.statusEl.parentNode.removeChild(this.statusEl);
		this.statusEl = null;

	}

};


XibleNode.prototype.setTracker = function(status) {

	if (this.removeTrackerTimeout) {

		window.clearTimeout(this.removeTrackerTimeout);
		this.removeTrackerTimeout = null;

	}

	if (this.trackerEl) {

		this.trackerEl.parentNode.removeChild(this.trackerEl);
		this.trackerEl = null;

	}

	if (status) {

		var div = this.trackerEl = document.createElement('div');
		div.classList.add('tracker');

		if (status.color) {
			div.classList.add(status.color);
		}

		if (status.message) {
			this.element.appendChild(div).appendChild(document.createTextNode(status.message));
		}

		if (status.timeout) {
			this.removeTrackerTimeout = window.setTimeout(() => {
				this.setTracker();
			}, status.timeout);
		}

	}

};


XibleNode.prototype.getInputByName = function(name) {
	return this.inputs[name];
};


XibleNode.prototype.getOutputByName = function(name) {
	return this.outputs[name];
};


XibleNode.prototype.getInputs = function() {

	let inputs = [];
	for (let name in this.inputs) {
		inputs.push(this.inputs[name]);
	}
	return inputs;

};


XibleNode.prototype.getOutputs = function() {

	let outputs = [];
	for (let name in this.outputs) {
		outputs.push(this.outputs[name]);
	}
	return outputs;

};


XibleNode.prototype.getInputsByType = function(type = null) {

	let inputs = [];
	for (let name in this.inputs) {
		if (this.inputs[name].type === type) {
			inputs.push(this.inputs[name]);
		}
	}
	return inputs;

};


XibleNode.prototype.getOutputsByType = function(type = null) {

	let outputs = [];
	for (let name in this.outputs) {
		if (this.outputs[name].type === type) {
			outputs.push(this.outputs[name]);
		}
	}
	return outputs;

};


XibleNode.prototype.getRootLabelElements = function() {
	return Array.from(this.editorContentEl.querySelectorAll(':host>label'));
};


XibleNode.prototype.getRootInputElements = function() {
	return Array.from(this.editorContentEl.querySelectorAll(':host>input, :host>selectcontainer'));
};


//creates a label for every input/selectcontainer element that doesn't have one
XibleNode.prototype.convenienceLabel = function() {

	this.getRootInputElements().forEach((el) => {

		let label = document.createElement('label');
		this.editorContentEl.replaceChild(label, el);
		label.appendChild(el);

		//copy the description to the label
		let description = el.getAttribute('data-description');
		if (description) {
			label.setAttribute('data-description', description);
		}

		//add the label
		let placeholder = el.getAttribute('placeholder') || el.getAttribute('data-outputvalue');
		let span = document.createElement('span');

		//try to fetch a placeholder for a select input
		if (!placeholder && el.nodeName === 'SELECTCONTAINER') {

			let selectEl = el.querySelector('select');
			if (selectEl) {
				placeholder = selectEl.getAttribute('placeholder') || selectEl.getAttribute('data-outputvalue');
			}

		}

		if (!placeholder) {
			span.classList.add('unknown');
		}

		span.appendChild(document.createTextNode(placeholder || 'unknown'));
		label.appendChild(span);

		//ensure hideif attached is hooked properly
		let hideIfAttached = el.getAttribute('data-hideifattached');
		if (hideIfAttached) {
			label.setAttribute('data-hideifattached', hideIfAttached);
		}

	});

};


XibleNode.prototype.convenienceOutputValue = function() {

	let els = Array.from(this.editorContentEl.querySelectorAll('[data-outputvalue]'));
	els.forEach((el) => {

		let attr = el.getAttribute('data-outputvalue');
		let type = el.getAttribute('type');

		//set the default value
		if (this.data[attr]) {

			if (type === 'checkbox' && el.getAttribute('value') === this.data[attr]) {
				el.checked = true;
			} else if (el.nodeName === 'SELECT') {

				Array.from(el.querySelectorAll('option')).forEach((option) => {

					if ((option.getAttribute('value') || option.textContent) === this.data[attr]) {
						option.selected = true;
					} else {
						option.selected = false;
					}

				});

			} else {
				el.setAttribute('value', this.data[attr]);
			}

		} else if (typeof this.data[attr] === 'undefined') {

			if (type === 'checkbox') {
				el.checked = false;
			} else {
				this.data[attr] = el.value;
			}

		}

		switch (type) {

			//hidden inputs don't trigger 'onchange' or 'oninput'
			case 'hidden':

				let observer = new MutationObserver((mutations) => {
					mutations.forEach((mutation) => {

						if (mutation.attributeName === 'value') {
							this.setData(attr, el.value);
						}

					});
				});

				observer.observe(el, {
					attributes: true,
					childList: false,
					characterData: false
				});

				break;

				//checkbox and radio both don't trigger input event
			case 'checkbox':
			case 'radio':

				el.addEventListener('change', () => {

					if (el.checked) {
						this.setData(attr, el.value);
					} else {
						this.setData(attr, null);
					}

				});

				break;

			default:

				el.addEventListener('input', () => {
					this.setData(attr, el.value);
				});

				break;

		}

	});

};


XibleNode.prototype.convenienceHideIfAttached = function() {

	var els = Array.from(this.editorContentEl.querySelectorAll('[data-hideifattached]'));
	els.forEach(el => {

		var attr = el.getAttribute('data-hideifattached');
		var matchArray;
		var ioArray = [];

		var re = /(input|output)\s*\[\s*name\s*=\s*"?(\w*)"?\s*\]/g;
		while ((matchArray = re.exec(attr))) {

			let io = this[matchArray[1] + 's'][matchArray[2]];
			if (io) {

				ioArray.push(io);

				if (io.connectors.length) {
					el.style.display = 'none';
				}

				io.on('editorAttach', () => {
					el.style.display = 'none';
				});

				io.on('editorDetach', () => {

					if (ioArray.every((io) => !io.connectors.length)) {
						el.style.display = '';
					}

				});

			}

		}

	});

};


function XibleNodeIo() {
	this.init.apply(this, arguments);
}


Object.assign(XibleNodeIo.prototype, EventEmitter.prototype);


XibleNodeIo.prototype.init = function(name, obj) {

	this.element = document.createElement('li');
	this.element.appendChild(document.createElement('div'));

	//FIXME: this isn't going to work anymore
	EventEmitter.call(this);

	this.hidden = false;
	this.singleType = false;
	this.maxConnectors = null;
	this.global = false;
	this.connectors = [];
	this.description = null;

	//set the name for this io
	this.setName(name);

	//set the props
	if (obj) {

		this._id = obj._id;

		//set the class
		this.setType(obj.type);

		if (typeof obj.singleType === 'boolean' && obj.singleType && !this.type) {
			this.setSingleType(obj.singleType);
		}

		if (typeof obj.maxConnectors === 'number') {
			this.setMaxConnectors(obj.maxConnectors);
		}

		if (obj.hidden) {
			this.hide();
		}

		if (obj.global) {
			this.setGlobal(true);
		}

		if (typeof obj.description === 'string') {
			this.description = obj.description;
		}

	}

	//enable mousedown -> mousemove handler for creating new connections
	this.enableHook();

};


XibleNodeIo.prototype.setSingleType = function(bool) {

	this.singleType = bool;

	//TODO: unhook eventlisteners when changing singleType

	if (this.singleType) {

		this.on('editorAttach', (conn) => {

			let connLoc = conn[this instanceof XibleNodeInput ? 'origin' : 'destination'];
			if (connLoc.type) {
				this.setType(connLoc.type);
			}

		});

		this.on('editorDetach', function() {

			if (!this.connectors.length) {
				this.setType(null);
			}

		});

	}

	this.verifyConnectors();

};


XibleNodeIo.prototype.setGlobal = function(global) {

	this.global = global;

	if (global) {
		this.element.classList.add('global');
	} else {
		this.element.classList.remove('global');
	}

};


XibleNodeIo.prototype.setMaxConnectors = function(max) {

	this.maxConnectors = max;
	this.verifyConnectors();

};


XibleNodeIo.prototype.setType = function(type) {

	//remove old type
	if (this.type) {
		this.element.classList.remove(this.type);
	}

	//set new type
	this.type = type;
	if (type) {
		this.element.classList.add(type);
	}

	this.verifyConnectors();

	return this;

};


XibleNodeIo.prototype.setName = function(name) {

	if (!name || this.name) {
		return;
	}

	//remove old name
	if (this.element.firstChild.firstChild) {
		this.element.firstChild.removeChild(this.element.firstChild.firstChild);
	}

	//set new type
	this.name = name;
	this.element.firstChild.appendChild(document.createTextNode(name));

	return this;

};


//TODO: need to implement this serverside
XibleNodeIo.prototype.verifyConnectors = function() {

	//remove connectors if we have too many
	//always removes the latest added conns
	if (typeof this.maxConnectors === 'number') {

		while (this.connectors.length > this.maxConnectors) {
			this.connectors[this.connectors.length - 1].delete();
		}

	}

	//verify type
	let checkPlace = this instanceof XibleNodeInput ? 'origin' : 'destination';
	if (this.type) {

		this.connectors
			.filter((conn) => conn[checkPlace].type && conn[checkPlace].type !== this.type)
			.forEach((conn) => conn.delete());

	}

};


XibleNodeIo.prototype.hide = function() {

	this.hidden = true;
	this.element.style.display = 'none';

};


XibleNodeIo.prototype.unhide = function() {

	this.hidden = false;
	this.element.style.display = '';

};


XibleNodeIo.prototype.delete = function() {

	while (this.connectors.length) {
		this.connectors[0].delete();
	}

	if (this.node && this instanceof XibleNodeInput) {
		delete this.node.inputs[this.name];
	}

	if (this.node && this instanceof XibleNodeOutput) {
		delete this.node.outputs[this.name];
	}

	if (this.parentNode) {
		this.parentNode.removeChild(this);
	}

};


//create hook handler for clicking
XibleNodeIo.prototype.enableHook = function() {

	var el = this.element;

	//handle whenever someone inits a new connector on this action
	el.addEventListener('mousedown', (e) => {

		//we only take action from the first mousebutton
		if (e.button !== 0) {
			return;
		}

		//if there's nothing to move, return
		if (e.shiftKey && this.connectors.length === 0) {
			return;
		}

		e.stopPropagation();

		//create a dummy action that acts as the input parent while moving
		window.dummyXibleNode = new XibleNode({
			name: 'dragdummy'
		});

		//hide the dummy
		//window.dummyXibleNode.element.style.opacity = 0.5;
		window.dummyXibleNode.element.style.visibility = 'hidden';
		window.dummyXibleNode.element.style.zIndex = -1;

		let outGoing = this instanceof XibleNodeOutput;
		outGoing = e.shiftKey ? !outGoing : outGoing;

		//create a dummyinput that acts as the connector endpoint
		if (outGoing) {
			window.dummyIo = new XibleNodeInput('dummy', {
				type: this.type
			});
		} else {
			window.dummyIo = new XibleNodeOutput('dummy', {
				type: this.type
			});
		}
		window.dummyXibleNode.appendChild(window.dummyIo);

		//add the dummy to the editor
		this.node.editor.appendNode(window.dummyXibleNode);

		//get window offsets for viewport
		let actionsOffset = this.node.editor.getOffsetPosition();

		//set the initial position at the mouse position
		let left = ((e.pageX - actionsOffset.left - this.node.editor.left) / this.node.editor.zoom) - window.dummyIo.element.offsetLeft - (outGoing ? 0 : window.dummyIo.element.offsetWidth + 2);
		let top = ((e.pageY - actionsOffset.top - this.node.editor.top) / this.node.editor.zoom) - window.dummyIo.element.offsetTop - (window.dummyIo.element.offsetHeight / 2);

		window.dummyXibleNode.setPosition(left, top);

		//append the connector
		if (e.shiftKey) {

			//find selected connectors
			let selectedConnectors = this.node.editor.selection.filter((sel) => sel instanceof XibleConnector && (sel.origin === this || sel.destination === this));
			window.dummyXibleConnectors = selectedConnectors.length ? selectedConnectors : this.connectors.slice(0);

			if (outGoing) {
				window.dummyXibleConnectors.forEach((conn) => conn.setDestination(window.dummyIo));
			} else {
				window.dummyXibleConnectors.forEach((conn) => conn.setOrigin(window.dummyIo));
			}

		} else {

			window.dummyXibleConnectors = [this.node.editor.appendConnector(new XibleConnector({
				origin: outGoing ? this : window.dummyIo,
				destination: outGoing ? window.dummyIo : this,
				type: this.type
			}))];

		}

		//make the dummy action drag
		this.node.editor.deselect();
		this.node.editor.select(window.dummyXibleNode);
		this.node.editor.initDrag(e);

		//keep track of these for snap ins
		window.dummyXibleConnectors.originalOrigin = window.dummyXibleConnectors[0].origin;
		window.dummyXibleConnectors.originalDestination = window.dummyXibleConnectors[0].destination;

	});

	//handle whenever someone drops a new connector on this action
	el.addEventListener('mouseup', e => {

		let outGoing = this instanceof XibleNodeOutput;

		//'this' is the destination
		if ((outGoing && window.dummyXibleConnectors && this.node !== window.dummyXibleConnectors[0].destination.node && ((!this.type && window.dummyXibleConnectors[0].destination.type !== 'trigger') || (!window.dummyXibleConnectors[0].destination.type && this.type !== 'trigger') || this.type === window.dummyXibleConnectors[0].destination.type)) ||
			(!outGoing && window.dummyXibleConnectors && this.node !== window.dummyXibleConnectors[0].origin.node && ((!this.type && window.dummyXibleConnectors[0].origin.type !== 'trigger') || (!window.dummyXibleConnectors[0].origin.type && this.type !== 'trigger') || this.type === window.dummyXibleConnectors[0].origin.type))) {

			//create the new connectors
			window.dummyXibleConnectors.forEach((conn) => {

				let newConn = new XibleConnector({
					origin: outGoing ? this : conn.origin,
					destination: outGoing ? conn.destination : this
				});

				newConn.destination.setGlobal(false);

				this.node.editor.loadedFlow.connectors.push(newConn);
				this.node.editor.appendConnector(newConn);

			});

			//ensure we deselect
			this.node.editor.deselect();

			//destroy the temporary connector & dummyXibleNode
			window.dummyXibleNode.delete();
			window.dummyXibleConnectors = window.dummyXibleNode = window.dummyIo = null;

		}

	});

	//handle snap-to whenever a new connector is hovered over this action
	el.addEventListener('mouseover', e => {

		if (!window.dummyXibleConnectors) {
			return;
		}

		//we don't allow snap-in if the selected connectors or of multiple types
		//while the input/output only allows a single type to be connected
		let multiType = window.dummyXibleConnectors.some((conn) => conn.type !== window.dummyXibleConnectors[0].type);
		if (multiType && this.singleType) {
			return;
		}

		if (this instanceof XibleNodeInput && this.node !== window.dummyXibleConnectors[0].origin.node && window.dummyXibleConnectors[0].destination === window.dummyIo && ((!this.type && window.dummyXibleConnectors[0].origin.type !== 'trigger') || (!window.dummyXibleConnectors[0].origin.type && this.type !== 'trigger') || this.type === window.dummyXibleConnectors[0].origin.type)) {
			window.dummyXibleConnectors.forEach((conn) => conn.setDestination(this));
		} else if (this instanceof XibleNodeOutput && this.node !== window.dummyXibleConnectors[0].destination.node && window.dummyXibleConnectors[0].origin === window.dummyIo && ((!this.type && window.dummyXibleConnectors[0].destination.type !== 'trigger') || (!window.dummyXibleConnectors[0].destination.type && this.type !== 'trigger') || this.type === window.dummyXibleConnectors[0].destination.type)) {
			window.dummyXibleConnectors.forEach((conn) => conn.setOrigin(this));
		}

	});

	//handle snap-out
	el.addEventListener('mouseout', e => {

		if (this instanceof XibleNodeInput && window.dummyXibleConnectors && window.dummyXibleConnectors[0].destination === this && window.dummyXibleConnectors[0].destination !== window.dummyXibleConnectors.originalDestination) {
			window.dummyXibleConnectors.forEach((conn) => conn.setDestination(window.dummyIo));
		} else if (this instanceof XibleNodeOutput && window.dummyXibleConnectors && window.dummyXibleConnectors[0].origin === this && window.dummyXibleConnectors[0].origin !== window.dummyXibleConnectors.originalOrigin) {
			window.dummyXibleConnectors.forEach((conn) => conn.setOrigin(window.dummyIo));
		}

	});

};


function XibleNodeInput() {
	this.init.apply(this, arguments);
}


XibleNodeInput.prototype = Object.create(XibleNodeIo.prototype);


XibleNodeInput.prototype.init = function() {
	XibleNodeIo.prototype.init.apply(this, arguments);
};


function XibleNodeOutput() {
	this.init.apply(this, arguments);
}


XibleNodeOutput.prototype = Object.create(XibleNodeIo.prototype);


XibleNodeOutput.prototype.init = function() {

	XibleNodeIo.prototype.init.apply(this, arguments);

	this.element.addEventListener('dblclick', () => {

		if (this.global) {
			this.setGlobal(false);
		} else {
			this.setGlobal(true);
		}

	});

};


XibleNodeOutput.prototype.setGlobal = function(global) {

	XibleNodeIo.prototype.setGlobal.call(this, global);

	if (this.node && this.node.flow) {
		this.node.flow.emit('global', this);
	}

};


function XibleConnector() {
	this.init.apply(this, arguments);
}

//init connector
XibleConnector.prototype.init = function(obj) {

	//create the connector HTML/SVG elements
	this.element = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	this.element.classList.add('connector');
	let path = this.element.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'path'));

	//set the origin & destination
	if (obj) {

		this.setOrigin(obj.origin);
		this.setDestination(obj.destination);

		if (obj.type) {
			this.setType(obj.type);
		}

	}

	//selection handlers
	path.addEventListener('mousedown', e => this.editor.toggleSelectionOnMouseEvent(e, this));
	path.addEventListener('mouseup', e => this.editor.toggleSelectionOnMouseEvent(e, this));

};


XibleConnector.prototype.setType = function(type) {

	if (this.type) {
		this.element.firstChild.classList.remove(this.type);
	}

	this.type = type;
	this.element.firstChild.classList.add(this.type);

};


XibleConnector.prototype.setOrigin = function(origin) {

	//remove from old origin
	if (this.origin && this.origin.connectors.indexOf(this) > -1) {

		this.origin.connectors.splice(this.origin.connectors.indexOf(this), 1);
		this.origin.node.removeListener('position', this.originDrawFn);

		//trigger detachment
		this.origin.emit('editorDetach', this);

	}

	this.origin = origin;
	if (!origin) {
		return null;
	}

	this.setType(origin.type);

	//delete existing connection(s) between origin and destination
	if (!window.dummyXibleConnectors || window.dummyXibleConnectors.indexOf(this) === -1) {

		origin.connectors
			.filter((conn) => conn.destination === this.destination)
			.forEach((conn) => conn.delete());

	}

	origin.connectors.push(this);
	this.draw();

	//trigger attachment functions
	origin.emit('editorAttach', this);

	//redraw on move of origin
	this.origin.node.on('position', this.originDrawFn = this.draw.bind(this));

};


XibleConnector.prototype.setDestination = function(destination) {

	//remove from old destination
	if (this.destination && this.destination.connectors.indexOf(this) > -1) {

		this.destination.connectors.splice(this.destination.connectors.indexOf(this), 1);
		this.destination.node.removeListener('position', this.destinationDrawFn);

		//find global conns with same type
		if (!this.destination.connectors.length && this.destination.type && document.querySelector(`.output>.${this.destination.type.replace(/\./g,'\\.')}.global`)) {
			this.destination.setGlobal(true);
		}

		//trigger detachment
		this.destination.emit('editorDetach', this);

	}

	this.destination = destination;
	if (!destination) {
		return null;
	}

	//delete existing connection(s) between origin and destination
	if (!window.dummyXibleConnectors || window.dummyXibleConnectors.indexOf(this) === -1) {

		destination.connectors
			.filter((conn) => conn.origin === this.origin)
			.forEach((conn) => conn.delete());

	}

	destination.connectors.push(this);
	this.draw();

	//trigger attachment functions
	destination.emit('editorAttach', this);

	//redraw on move of destination
	this.destination.node.on('position', this.destinationDrawFn = this.draw.bind(this));

};


XibleConnector.prototype.draw = function() {

	let {
		element: el,
		origin,
		destination
	} = this;

	//only continue if both sides are known
	if (destination && origin) {
		el.style.visibility = '';
	} else {

		el.style.visibility = 'none';
		return false;

	}

	if (!el.parentNode) {
		return;
	}

	//get the position of the output
	let originNodeStyle = getComputedStyle(origin.node.element);
	let originLeft = origin.node.left + origin.element.offsetLeft + origin.element.offsetWidth + parseInt(originNodeStyle.borderLeftWidth) + parseInt(originNodeStyle.paddingLeft);
	let originTop = origin.node.top + origin.element.offsetTop;

	//get the position of the input
	let destinationNodeStyle = getComputedStyle(destination.node.element);
	let destinationLeft = destination.node.left + destination.element.offsetLeft + parseInt(destinationNodeStyle.borderLeftWidth) + parseInt(destinationNodeStyle.paddingLeft);
	let destinationTop = destination.node.top + destination.element.offsetTop;

	//get the distances between input and output
	let height = Math.abs(originTop - destinationTop);
	let width = Math.abs(originLeft - destinationLeft);

	//calculate the tension
	const maxTension = 100;
	const minTension = 0;
	let tension = Math.floor((width / 3) + (height / 3));

	if (originLeft - destinationLeft < 0) {
		tension = tension > maxTension ? maxTension : tension;
	}

	tension = tension < minTension ? minTension : tension;

	//update the path for the bezier curve
	let startX = destinationLeft > originLeft ? (tension / 2) : width + (tension / 2);
	let endX = destinationLeft > originLeft ? destinationLeft - originLeft + (tension / 2) : 0 + (tension / 2);
	let startY = destinationTop > originTop ? 10 : height + 10;
	let endY = destinationTop > originTop ? destinationTop - originTop + 10 : 10;
	el.firstChild.setAttribute('d', 'M' + startX + ',' + startY + ' C' + (startX + tension) + ',' + startY + ' ' + (endX - tension) + ',' + endY + ' ' + endX + ',' + endY);

	//get the bounding box for the bezier curve so we can size the parent svg element
	let pathBounding = el.firstChild.getBoundingClientRect();
	let pathWidth = (pathBounding.width / this.editor.zoom);

	//calc the x/y position of the svg element
	let left = ((originLeft < destinationLeft ? originLeft : destinationLeft));
	let top = (originTop < destinationTop ? originTop : destinationTop);

	//apply tension to left position of svg
	left -= (tension / 2);

	//update the location and size of the svg
	el.style.transform = `translate(${left}px, ${top}px)`;
	el.style.width = (width + tension) + 'px';
	el.style.height = (height + 20) + 'px';

	this.top = top;
	this.left = left;

};


//delete this connector
XibleConnector.prototype.delete = function() {

	this.setOrigin(null);
	this.setDestination(null);

	if (this.editor) {
		this.editor.removeChild(this);
	}

};
