View.routes.editor = function() {

	let xibleEditor = View.routes.editor.xibleEditor = new XibleEditor();

	this.element.style.height = '100%';
	this.element.setAttribute('id', 'xibleView');

	let menuHolder = this.element.appendChild(document.createElement('div'));
	menuHolder.setAttribute('id', 'sub');

	menuHolder.appendChild(document.createElement('header')).appendChild(document.createTextNode('XIBLE'));

	//create menu
	let buttonSection = menuHolder.appendChild(document.createElement('section'));
	buttonSection.classList.add('buttons');

	//deploy
	var button = buttonSection.appendChild(document.createElement('button'));
	button.appendChild(document.createTextNode('Deploy'));
	button.setAttribute('id', 'xibleFlowDeployButton');
	button.onclick = function() {

		xibleEditor.loadedFlow.save().then((flow) => flow.start());
		return false;

	};

	//start
	button = buttonSection.appendChild(document.createElement('button'));
	button.appendChild(document.createTextNode('Start'));
	button.setAttribute('id', 'xibleFlowStartButton');
	button.onclick = function() {

		xibleEditor.loadedFlow.start();
		return false;

	};

	//stop
	button = buttonSection.appendChild(document.createElement('button'));
	button.appendChild(document.createTextNode('Stop'));
	button.setAttribute('id', 'xibleFlowStopButton');
	button.onclick = function() {

		xibleEditor.loadedFlow.stop();
		return false;

	};

	//save
	button = buttonSection.appendChild(document.createElement('button'));
	button.appendChild(document.createTextNode('Save'));
	button.setAttribute('id', 'xibleFlowSaveButton');
	button.onclick = function() {

		xibleEditor.loadedFlow.save();
		return false;

	};

	//delete
	button = buttonSection.appendChild(document.createElement('button'));
	button.appendChild(document.createTextNode('Delete'));
	button.setAttribute('id', 'xibleFlowDeleteButton');
	button.onclick = function() {

		xibleEditor.loadedFlow.delete();

		let flowTab = document.querySelector(`.flowList>li[data-flowid="${xibleEditor.loadedFlow._id}"]`);
		if (flowTab) {
			flowTab.parentNode.removeChild(flowTab);
		}

		return false;

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
	let cpuChart = stats.appendChild(document.createElement('canvas'));
	cpuChart.setAttribute('id', 'cpuChart');

	let label = stats.appendChild(document.createElement('label'));
	label.setAttribute('id', 'cpu');
	label.appendChild(document.createTextNode('cpu'));

	//memory chart
	let memChart = stats.appendChild(document.createElement('canvas'));
	memChart.setAttribute('id', 'memChart');

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
	let delayChart = stats.appendChild(document.createElement('canvas'));
	delayChart.setAttribute('id', 'delayChart');

	label = stats.appendChild(document.createElement('label'));
	label.setAttribute('id', 'delay');
	label.appendChild(document.createTextNode('event loop delay'));

	xibleEditor.initConsole();




	let flowEditorHolder = this.element.appendChild(document.createElement('div'));
	flowEditorHolder.setAttribute('id', 'flowEditorHolder');

	//create flowlist menu
	let flowListUl = flowEditorHolder.appendChild(document.createElement('ul'));
	flowListUl.classList.add('flowList');

	//let xibleEditor = View.routes.editor.xibleEditor;
	//if (!xibleEditor) {

	//}
	/*
	subMenuViewHolder.render(new View('xibleSubMenu', {
		xibleEditor: xibleEditor
	}));
	subMenuViewHolder.element.classList.add('open');
*/

	var wsXible = function() {

		ws = new WebSocket('wss://10.0.0.20:9601');
		xibleEditor.initWebSocket(ws);

		//try to reconnect
		ws.addEventListener('close', (event) => {
			window.setTimeout(wsXible, 1000);
		});

	};

	wsXible();

	flowEditorHolder.appendChild(xibleEditor.element);

	function createFlowTab(flow) {

		let li = flowListUl.appendChild(document.createElement('li'));
		li.setAttribute('data-flowId', flow._id);
		let a = li.appendChild(document.createElement('a'));
		a.appendChild(document.createTextNode(flow.name || flow._id));
		if (!flow.runnable) {
			li.classList.add('notRunnable');
		}
		a.onclick = () => {

			Array.from(document.querySelectorAll('.flowList>li.open')).forEach((li) => {
				li.classList.remove('open');
			});
			li.classList.add('open');

			xibleEditor.viewFlow(flow);

		};

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
	a.appendChild(document.createTextNode('+'));
	a.onclick = () => {

		Array.from(document.querySelectorAll('.flowList>li.open')).forEach((li) => {
			li.classList.remove('open');
		});

		let flow = new XibleEditorFlow();
		xibleEditor.viewFlow(flow);
		flow.save().then(() => {

			xibleEditor.flows[flow._id] = flow;
			createFlowTab(flow).classList.add('open');

		});

	};

	//get all flows and add them
	xibleEditor.getFlows().then((flows) => {

		Object.keys(flows).forEach((id) => {
			createFlowTab(flows[id]);
		});

	});

};
