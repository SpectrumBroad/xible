View.routes.xibleSubMenu = function() {

	let xibleEditor = this.properties.xibleEditor;

	//create menu
	let buttonSection = this.element.appendChild(document.createElement('section'));

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
	this.appendChild(cons);

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

};
