View.routes.editor = function() {

	this.element.innerHTML = `
		<div id="sub">
			<header>XIBLE<!--<span>ENTERPRISE</span>--></header>
			<p class="status loading alert hidden">Connection lost</p>
			<p id="validateWritePermissions" class="status loading">Validating write permissions</p>
			<section class="buttons">
				<button type="button" id="xibleFlowDeployButton">Deploy</button>
				<button type="button" id="xibleFlowStartButton">Start</button>
				<button type="button" id="xibleFlowStopButton">Stop</button>
				<button type="button" id="xibleFlowSaveButton">Save</button>
				<button type="button" id="xibleFlowDeleteButton">Delete</button>
			</section>
			<section id="console">
				<div class="stats">

					<canvas id="cpuChart"></canvas>
					<label id="cpu">cpu</label>

					<canvas id="memChart"></canvas>
					<label id="rss">rss</label>
					<label id="heapTotal">heap total</label>
					<label id="heapUsed">heap used</label>

					<canvas id="delayChart"></canvas>
					<label id="delay">event loop delay</label>

				</div>
			</section>
		</div>
	`;

	let xibleEditor = new XibleEditor();
	let connectionLost = document.getElementById('connectionLost');
	let permissionsValidate = document.getElementById('validateWritePermissions');

	//validate if the flows can be altered
	xibleWrapper.Flow.validatePermissions().then((result) => {

		permissionsValidate.addEventListener('animationiteration', () => {
			permissionsValidate.classList.remove('loading');
		}, {
			once: true
		});

		if (result) {

			permissionsValidate.innerHTML = 'Write permissions check success.';
			permissionsValidate.classList.add('success');

			window.setTimeout(() => {
				permissionsValidate.parentNode.removeChild(permissionsValidate);
			}, 6000);

		} else {

			permissionsValidate.innerHTML = 'Writing to the flow path failed. Please check permissions.';
			permissionsValidate.classList.add('alert');

		}

	});

	//hook buttons
	//deploy
	document.getElementById('xibleFlowDeployButton').onclick = function() {
		xibleEditor.loadedFlow
			.save()
			.then((flow) => flow.start());
	};

	//start
	document.getElementById('xibleFlowStartButton').onclick = function() {
		xibleEditor.loadedFlow.start();
	};

	//stop
	document.getElementById('xibleFlowStopButton').onclick = function() {
		xibleEditor.loadedFlow.stop();
	};

	//save
	document.getElementById('xibleFlowSaveButton').onclick = function() {
		xibleEditor.loadedFlow.save();
	};

	//delete
	document.getElementById('xibleFlowDeleteButton').onclick = function() {

		if (!xibleEditor.loadedFlow) {
			return;
		}

		if (window.confirm(`Are you sure you wan't to permanently delete flow "${xibleEditor.loadedFlow._id}"?`)) {

			xibleEditor.loadedFlow.delete();

			let flowTab = document.querySelector(`.flowList>li[data-flowid="${xibleEditor.loadedFlow._id}"]`);
			if (flowTab) {
				flowTab.parentNode.removeChild(flowTab);
			}

		}

	};

	//cpu chart
	let cpuCanvas = document.getElementById('cpuChart');
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


	//memory chart
	let memCanvas = document.getElementById('memChart');
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

	//delay chart
	let delayCanvas = document.getElementById('delayChart');
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

			Array.from(flowListUl.querySelectorAll('li.open')).forEach((li) => {
				li.classList.remove('open');
			});
			li.classList.add('open');

			xibleEditor.viewFlow(flow);

			//get all persistent websocket messages
			xibleWrapper.getPersistentWebSocketMessages().then((messages) => {

				for (let flowId in messages) {

					for (let nodeId in messages[flowId]) {

						for (let statusId in messages[flowId][nodeId]) {
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

		if (flow.directed) {
			li.classList.add('direct');
		}

		flow.on('started', (event) => {

			if (event.directed) {
				li.classList.add('direct');
			} else {
				li.classList.remove('direct');
			}

			li.classList.remove('notRunnable', 'starting', 'stopping');
			li.classList.add('started');

		});

		flow.on('starting', (event) => {

			if (event.directed) {
				li.classList.add('direct');
			} else {
				li.classList.remove('direct');
			}

			li.classList.remove('started', 'stopping');
			li.classList.add('starting');

		});

		flow.on('stopping', () => {

			li.classList.remove('started', 'starting', 'direct');
			li.classList.add('stopping');

		});

		flow.on('stopped', () => {
			li.classList.remove('started', 'starting', 'stopping', 'direct');
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
	function loadFlows() {

		flowListUl.classList.add('loading');

		//ensure all flows tabs are gone
		Array.from(flowListUl.querySelectorAll('li:not(.add)')).forEach((li) => {
			flowListUl.removeChild(li);
		});

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

	}

	//socket connection
	if (xibleWrapper.readyState === XibleWrapper.STATE_OPEN) {

		xibleEditor.initWebSocket(xibleWrapper.webSocket);
		loadFlows();

	} else {
		connectionLost.classList.remove('hidden');
	}

	xibleWrapper.on('open', () => {

		connectionLost.addEventListener('animationiteration', () => {
			connectionLost.classList.add('hidden');
		}, {
			once: true
		});

		//reload the flows
		loadFlows();

		xibleEditor.initWebSocket(xibleWrapper.webSocket);

	});

	//clear all flow statuses when connection closes
	xibleWrapper.on('close', () => {

		connectionLost.classList.remove('hidden');

		Array.from(flowListUl.querySelectorAll('li')).forEach((li) => {
			li.classList.remove('started', 'starting', 'stopping', 'direct');
		});

	});

};
