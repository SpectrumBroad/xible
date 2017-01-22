View.routes.editor = function() {

	let xibleEditor = new XibleEditor();

	let menuHolder = this.element.appendChild(document.createElement('div'));
	menuHolder.setAttribute('id', 'sub');

	let header=menuHolder.appendChild(document.createElement('header'));
	header.appendChild(document.createTextNode('XIBLE'));

	//header.appendChild(document.createElement('span')).appendChild(document.createTextNode('ENTERPRISE'));

	let permissionsValidate = menuHolder.appendChild(document.createElement('p'));
	permissionsValidate.innerHTML = 'Validating write permissions';
	permissionsValidate.classList.add('status', 'loading');

	xibleWrapper.Flow.validatePermissions().then((result) => {

		permissionsValidate.addEventListener('animationiteration', () => {
			permissionsValidate.classList.remove('loading');
		}, {
			once: true
		});

		if (result) {

			permissionsValidate.innerHTML = 'Write permissions check success.';
			permissionsValidate.classList.remove('checking');
			permissionsValidate.classList.add('success');

			window.setTimeout(() => {
				menuHolder.removeChild(permissionsValidate);
			}, 6000);

		} else {

			permissionsValidate.innerHTML = 'Writing to the flow path failed. Please check permissions.';
			permissionsValidate.classList.remove('checking', 'loading');
			permissionsValidate.classList.add('alert');

		}

	});

	//create menu
	let buttonSection = menuHolder.appendChild(document.createElement('section'));
	buttonSection.classList.add('buttons');

	//deploy
	var button = buttonSection.appendChild(document.createElement('button'));
	button.appendChild(document.createTextNode('Deploy'));
	button.setAttribute('type', 'button');
	button.setAttribute('id', 'xibleFlowDeployButton');
	button.onclick = function() {
		xibleEditor.loadedFlow.save().then((flow) => flow.start());
	};

	//start
	button = buttonSection.appendChild(document.createElement('button'));
	button.appendChild(document.createTextNode('Start'));
	button.setAttribute('type', 'button');
	button.setAttribute('id', 'xibleFlowStartButton');
	button.onclick = function() {
		xibleEditor.loadedFlow.start();
	};

	//stop
	button = buttonSection.appendChild(document.createElement('button'));
	button.appendChild(document.createTextNode('Stop'));
	button.setAttribute('type', 'button');
	button.setAttribute('id', 'xibleFlowStopButton');
	button.onclick = function() {
		xibleEditor.loadedFlow.stop();
	};

	//save
	button = buttonSection.appendChild(document.createElement('button'));
	button.appendChild(document.createTextNode('Save'));
	button.setAttribute('type', 'button');
	button.setAttribute('id', 'xibleFlowSaveButton');
	button.onclick = function() {
		xibleEditor.loadedFlow.save();
	};

	//delete
	button = buttonSection.appendChild(document.createElement('button'));
	button.appendChild(document.createTextNode('Delete'));
	button.setAttribute('type', 'button');
	button.setAttribute('id', 'xibleFlowDeleteButton');
	button.onclick = function() {

		if (!xibleEditor.loadedFlow) {
			return;
		}

		if (window.confirm(`Are you sure you wan't to permanently delete flow ${xibleEditor.loadedFlow._id}?`)) {

			xibleEditor.loadedFlow.delete();

			let flowTab = document.querySelector(`.flowList>li[data-flowid="${xibleEditor.loadedFlow._id}"]`);
			if (flowTab) {
				flowTab.parentNode.removeChild(flowTab);
			}

		}

	};

	//console
	//create console
	let cons = document.createElement('section');
	cons.setAttribute('id', 'console');
	menuHolder.appendChild(cons);

	//statistics holder
	let stats = cons.appendChild(document.createElement('div'));
	stats.classList.add('stats');

	//cpu chart
	let cpuCanvas = stats.appendChild(document.createElement('canvas'));
	cpuCanvas.setAttribute('id', 'cpuChart');
	let cpuChart = new Chart(cpuCanvas, {
		type: 'line',
		data: {
			labels: new Array(CHART_MAX_TICKS),
			datasets: [{
				lineTension: 0,
				pointRadius: 0,
				backgroundColor: 'rgb(50, 167, 167)',
				borderColor: 'rgb(50, 167, 167)',
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

	let label = stats.appendChild(document.createElement('label'));
	label.setAttribute('id', 'cpu');
	label.appendChild(document.createTextNode('cpu'));

	//memory chart
	let memCanvas = stats.appendChild(document.createElement('canvas'));
	memCanvas.setAttribute('id', 'memChart');
	let memChart = new Chart(memCanvas, {
		type: 'line',
		data: {
			labels: new Array(CHART_MAX_TICKS),
			datasets: [{
				lineTension: 0,
				pointRadius: 0,
				borderColor: 'rgb(230, 74, 107)',
				backgroundColor: 'rgb(230, 74, 107)',
				borderWidth: 1,
				label: 'heap used',
				data: []
			}, {
				lineTension: 0,
				pointRadius: 0,
				borderColor: 'rgb(29, 137, 210)',
				backgroundColor: 'rgb(29, 137, 210)',
				borderWidth: 1,
				label: 'heap total',
				data: []
			}, {
				lineTension: 0,
				pointRadius: 0,
				borderColor: 'rgb(230, 181, 61)',
				backgroundColor: 'rgb(230, 181, 61)',
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

	label = stats.appendChild(document.createElement('label'));
	label.setAttribute('id', 'rss');
	label.appendChild(document.createTextNode('rss'));

	label = stats.appendChild(document.createElement('label'));
	label.setAttribute('id', 'heapTotal');
	label.appendChild(document.createTextNode('heap total'));

	label = stats.appendChild(document.createElement('label'));
	label.setAttribute('id', 'heapUsed');
	label.appendChild(document.createTextNode('heap used'));

	//delay chart
	let delayCanvas = stats.appendChild(document.createElement('canvas'));
	delayCanvas.setAttribute('id', 'delayChart');
	let delayChart = new Chart(delayCanvas, {
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

	label = stats.appendChild(document.createElement('label'));
	label.setAttribute('id', 'delay');
	label.appendChild(document.createTextNode('event loop delay'));

	//update the usage charts
	xibleEditor.on('flow.usage', (flows) => {

		//only run this on the loaded flow
		let flow = flows.find((flow) => flow._id === xibleEditor.loadedFlow._id);
		if (!flow) {
			return;
		}

		while (memChart.data.datasets[0].data.length !== memChart.data.labels.length) {

			memChart.data.datasets[0].data.push(null);
			memChart.data.datasets[1].data.push(null);
			memChart.data.datasets[2].data.push(null);

			cpuChart.data.datasets[0].data.push(null);
			delayChart.data.datasets[0].data.push(null);

		}

		if (memChart.data.datasets[0].data.length === memChart.data.labels.length) {

			memChart.data.datasets[0].data.shift();
			memChart.data.datasets[1].data.shift();
			memChart.data.datasets[2].data.shift();

			cpuChart.data.datasets[0].data.shift();
			delayChart.data.datasets[0].data.shift();

		}

		memChart.data.datasets[2].data.push(Math.round(flow.usage.memory.rss / 1024 / 1024));
		memChart.data.datasets[1].data.push(Math.round(flow.usage.memory.heapTotal / 1024 / 1024));
		memChart.data.datasets[0].data.push(Math.round(flow.usage.memory.heapUsed / 1024 / 1024));
		memChart.update(0);

		cpuChart.data.datasets[0].data.push(flow.usage.cpu.percentage);
		cpuChart.update(0);

		delayChart.data.datasets[0].data.push(flow.usage.delay);
		delayChart.update(0);

	});

	function resetCharts() {

		while (memChart.data.datasets[0].data.length) {

			memChart.data.datasets[0].data.pop();
			memChart.data.datasets[1].data.pop();
			memChart.data.datasets[2].data.pop();

			cpuChart.data.datasets[0].data.pop();
			delayChart.data.datasets[0].data.pop();

		}

		memChart.update(0);
		cpuChart.update(0);
		delayChart.update(0);

	}

	resetCharts();

	//holds the flowlist and editor
	let flowEditorHolder = this.element.appendChild(document.createElement('div'));
	flowEditorHolder.setAttribute('id', 'flowEditorHolder');

	//zoom and reset
	let zoomButtons = flowEditorHolder.appendChild(document.createElement('div'));
	zoomButtons.classList.add('zoomButtons');
	let zoomOutButton = zoomButtons.appendChild(document.createElement('button'));
	zoomOutButton.appendChild(document.createTextNode('\ue024'));
	zoomOutButton.setAttribute('type', 'button');
	zoomOutButton.setAttribute('title', 'Zoom out');
	zoomOutButton.onclick = function() {

		xibleEditor.zoom -= 0.1;
		xibleEditor.transform();

	};
	let zoomResetButton = zoomButtons.appendChild(document.createElement('button'));
	zoomResetButton.appendChild(document.createTextNode('\ue01c'));
	zoomResetButton.setAttribute('type', 'button');
	zoomResetButton.setAttribute('title', 'Reset zoom');
	zoomResetButton.onclick = function() {

		xibleEditor.zoom = 1;
		xibleEditor.transform();

	};
	let zoomInButton = zoomButtons.appendChild(document.createElement('button'));
	zoomInButton.appendChild(document.createTextNode('\ue035'));
	zoomInButton.setAttribute('type', 'button');
	zoomInButton.setAttribute('title', 'Zoom in');
	zoomInButton.onclick = function() {

		xibleEditor.zoom += 0.1;
		xibleEditor.transform();

	};

	//create flowlist menu
	let flowListUl = flowEditorHolder.appendChild(document.createElement('ul'));
	flowListUl.classList.add('flowList', 'loading');

	//socket connection
	if(xibleWrapper.readyState === XibleWrapper.STATE_OPEN) {
		xibleEditor.initWebSocket(xibleWrapper.webSocket);
	}

	xibleWrapper.on('open', () => {
		xibleEditor.initWebSocket(xibleWrapper.webSocket);
	});

	flowEditorHolder.appendChild(xibleEditor.element);

	function createFlowTab(flow) {

		let li = flowListUl.appendChild(document.createElement('li'));
		li.setAttribute('data-flowId', flow._id);
		let a = li.appendChild(document.createElement('a'));
		a.appendChild(document.createTextNode(flow._id));
		a.setAttribute('title', flow._id);
		if (!flow.runnable) {
			li.classList.add('notRunnable');
		}
		a.onclick = () => {

			mainViewHolder.navigate(`/editor/${flow._id}`, true);

			resetCharts();

			Array.from(document.querySelectorAll('.flowList>li.open')).forEach((li) => {
				li.classList.remove('open');
			});
			li.classList.add('open');

			xibleEditor.viewFlow(flow);

			//get all persistent websocket messages
			xibleWrapper.getPersistentWebSocketMessages().then((messages) => {

				for(let flowId in messages) {

					for(let nodeId in messages[flowId]) {

						for(let statusId in messages[flowId][nodeId]) {
							xibleEditor.webSocketMessageHandler(messages[flowId][nodeId][statusId]);
						}

					}

				}

			});

		};

		//if in path, load it immediately
		let pathSplit = window.location.pathname.split('/');
		if (pathSplit[pathSplit.length - 1] === encodeURIComponent(flow._id)) {
			a.click();
		}

		if (flow.running) {
			li.classList.add('started');
		}

		flow.on('started', () => {

			li.classList.remove('notRunnable', 'starting', 'stopping');
			li.classList.add('started');

		});

		flow.on('starting', () => {

			li.classList.remove('started', 'stopping');
			li.classList.add('starting');

		});

		flow.on('stopping', () => {

			li.classList.remove('started', 'starting');
			li.classList.add('stopping');

		});

		flow.on('stopped', () => {
			li.classList.remove('started', 'starting', 'stopping');
		});

		return li;

	}

	//create button to add new flows
	let li = flowListUl.appendChild(document.createElement('li'));
	li.classList.add('add');
	let a = li.appendChild(document.createElement('a'));
	a.setAttribute('title', 'Add a flow');
	a.appendChild(document.createTextNode('+'));
	a.onclick = () => {

		let flowName = window.prompt('Enter the flow name:');

		if (flowName.substring(0, 1) === '_') {

			window.alert('The flow name may not start with an underscore');
			return;

		}

		resetCharts();

		Array.from(document.querySelectorAll('.flowList>li.open')).forEach((li) => {
			li.classList.remove('open');
		});

		let flow = new XibleEditorFlow({
			_id: flowName
		});
		let flowTab = createFlowTab(flow);
		flowTab.classList.add('open', 'loading');
		flowTab.firstChild.click();

		flow.save(true).then(() => {

			xibleEditor.flows[flow._id] = flow;

			flowTab.addEventListener('animationiteration', () => {
				flowTab.classList.remove('loading');
			}, {
				once: true
			});

		}).catch((err) => {

			//TODO: give feedback about what went wrong

			flowTab.classList.add('notRunnable');

			flowTab.addEventListener('animationiteration', () => {
				flowListUl.removeChild(flowTab);
			}, {
				once: true
			});

		});

	};

	//get all flows and add them
	xibleEditor.getFlows().then((flows) => {

		Object.keys(flows).forEach((id) => {
			createFlowTab(flows[id]);
		});

		flowListUl.addEventListener('animationiteration', () => {
			flowListUl.classList.remove('loading');
		}, {
			once: true
		});

	});

};
