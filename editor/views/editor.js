View.routes.editor = function() {

	this.element.style.height = '100%';

	//create flowlist menu
	var flowListUl = document.createElement('ul');
	flowListUl.classList.add('flowList');
	this.element.appendChild(flowListUl);

	let xibleEditor = View.routes.editor.xibleEditor;
	if (!xibleEditor) {
		xibleEditor = View.routes.editor.xibleEditor = new XibleEditor();
	}
	subMenuViewHolder.render(new View('xibleSubMenu', {
		xibleEditor: xibleEditor
	}));
	subMenuViewHolder.element.classList.add('open');

	var wsXible = function() {

		ws = new WebSocket('wss://10.0.0.20:9601');
		xibleEditor.initWebSocket(ws);

		//try to reconnect
		ws.addEventListener('close', e => {
			window.setTimeout(wsXible, 1000);
		});

	};

	wsXible();

	this.element.appendChild(xibleEditor.element);

	function createFlowTab(flow) {

		let li = flowListUl.appendChild(document.createElement('li'));
		li.setAttribute('data-flowId', flow._id);
		li.appendChild(document.createTextNode(flow.name || flow._id));
		if (!flow.runnable) {
			li.classList.add('notRunnable');
		}
		li.onclick = () => {

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

	xibleEditor.getFlows().then((flows) => {

		Object.keys(flows).forEach((id) => {
			createFlowTab(flows[id]);
		});

		let li = flowListUl.appendChild(document.createElement('li'));

		li.appendChild(document.createTextNode('+'));
		li.onclick = () => {

			Array.from(document.querySelectorAll('.flowList>li.open')).forEach((li) => {
				li.classList.remove('open');
			});

			let flow = new XibleFlow();
			xibleEditor.viewFlow(flow);
			flow.save().then(() => {

				xibleEditor.flows[flow._id] = flow;
				createFlowTab(flow).classList.add('open');

			});

		};

	});

};
