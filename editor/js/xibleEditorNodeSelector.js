class XibleEditorNodeSelector {

	constructor(XIBLE_EDITOR) {

		this.xibleEditor = XIBLE_EDITOR;

		//indicates if the selector was opened above or below the mouse position
		// and left or right
		this.openTop = false;
		this.openLeft = false;

		//x & y position the selector was opened
		this.openYPosition = 0;
		this.openXPosition = 0;

		//detail div for downloading new nodes
		let detailDiv = this.detailDiv = document.body.appendChild(document.createElement('div'));
		detailDiv.setAttribute('id', 'detailNodeSelector');
		detailDiv.classList.add('hidden');
		let detailDivSub = detailDiv.appendChild(document.createElement('div'));

		//check if this is maintained by spectrumbroad
		detailDivSub.appendChild(document.createElement('h1')).appendChild(document.createTextNode('maintained'));
		detailDivSub.appendChild(document.createElement('p')).appendChild(document.createTextNode('Spectrumbroad maintains this node.'));

		//permissions in detailDiv
		detailDivSub.appendChild(document.createElement('h1')).appendChild(document.createTextNode('Permissions'));
		detailDivSub.appendChild(document.createElement('p')).appendChild(document.createTextNode('This node requires the following permissions;'));
		let detailDivPermissionsUl = this.detailDivPermissionsUl = detailDivSub.appendChild(document.createElement('ul'));

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
			this.close();
		};

		//the div containing the node list
		let div = this.div = document.body.appendChild(document.createElement('div'));
		div.setAttribute('id', 'nodeSelector');
		div.classList.add('hidden');

		//this list will be populated with the local installed nodes
		let nodesUl = this.nodesUl = document.createElement('ul');

		let filterInput = this.filterInput = div.appendChild(document.createElement('input'));
		filterInput.setAttribute('type', 'text');
		filterInput.setAttribute('placeholder', 'filter nodes');
		filterInput.addEventListener('input', (event) => {

			//always hide the detail div when typing
			//this prevents the div to be left hanging at an incosistent position
			//relative to the main div
			this.detailDiv.classList.add('hidden');

			let noResults = true;
			nodesUl.querySelectorAll('li').forEach((li) => {

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

			this.position();

		});

		div.appendChild(nodesUl);

		//create a search online button
		let searchOnlineButton = div.appendChild(document.createElement('button'));
		searchOnlineButton.setAttribute('type', 'button');
		searchOnlineButton.appendChild(document.createTextNode('search online'));
		searchOnlineButton.setAttribute('title', 'Search xible.io for nodes matching your filter');
		searchOnlineButton.addEventListener('click', (event) => {

			if (!filterInput.value) {
				return;
			}

			this.detailDiv.classList.add('hidden');
			searchOnlineButton.classList.add('loading');

			//query the registry
			xibleWrapper.Registry
				.searchNodes(filterInput.value)
				.then((nodes) => {

					let nodeNames = Object.keys(nodes);

					//clear all non-online results
					if (nodeNames.length) {
						nodesUl.querySelectorAll('li:not(.online)').forEach((li) => {
							li.classList.add('hidden');
						});
					}

					//add the found nodes
					nodeNames.forEach((nodeName) => {

						//check if this nodeName doesn't already exist in the list
						if (nodesUl.querySelector(`li h1[title="${nodeName}"]`)) {
							return;
						}

						let li = this.buildNode(nodeName, nodes[nodeName]);
						li.classList.add('online');
						li.onclick = (event) => {

							//open the detailed confirmation view
							this.detailedNodeView(li, nodeName, nodes[nodeName]);

						};
						nodesUl.appendChild(li);

					});

					if (nodeNames.length) {
						div.classList.remove('noresults');
					} else {
						div.classList.add('noresults');
					}

					this.position();

					searchOnlineButton.addEventListener('animationiteration', () => {
						searchOnlineButton.classList.remove('loading');
					}, {
						once: true
					});

				})
				.catch((err) => {

					div.classList.add('noresults');

					searchOnlineButton.addEventListener('animationiteration', () => {
						searchOnlineButton.classList.remove('loading');
					}, {
						once: true
					});

				});

		});

		//open the node menu on contextmenu
		document.body.addEventListener('contextmenu', (event) => {

			if (this.xibleEditor.loadedFlow && (event.target === this.xibleEditor.element || event.target === this.xibleEditor.element.firstChild)) {

				this.open();
				event.preventDefault();
				return false;

			}

		});

		//open the node menu on double click
		document.body.addEventListener('dblclick', (event) => {

			if (!event.ctrlKey && this.xibleEditor.loadedFlow && (event.target === this.xibleEditor.element || event.target === this.xibleEditor.element.firstChild)) {
				this.open();
			}

		});

		//hide the nodeSelector element if selection moves elsewhere
		document.body.addEventListener('mousedown', (event) => {

			if (!div.classList.contains('hidden') && !div.contains(event.target) && !detailDiv.contains(event.target)) {
				this.close();
			}

		});

		this.fill();

	}

	detailedNodeView(li, nodeName, node) {

		this.detailDiv.classList.remove('hidden');
		this.detailDiv.style.top = this.div.style.top;
		this.detailDiv.style.left = (parseInt(this.div.style.left) + this.div.offsetWidth - parseInt(getComputedStyle(this.detailDiv).borderLeftWidth)) + 'px';

		//check if detailDiv overflows the chrome
		//if so, position detailDiv on the left side of div
		let clientRect = this.detailDiv.getBoundingClientRect();
		if (clientRect.left + clientRect.width > window.innerWidth) {
			this.detailDiv.style.left = (parseInt(this.div.style.left) - clientRect.width + parseInt(getComputedStyle(this.detailDiv).borderRightWidth)) + 'px';
		}

		//also check top
		//align bottoms together if so
		if (clientRect.top + clientRect.height > window.innerHeight) {

			let divClientBottom = parseInt(this.div.style.top) + this.div.offsetHeight;
			this.detailDiv.style.top = (divClientBottom - clientRect.height) + 'px';

		}

		//add the permissions to the list
		this.detailDivPermissionsUl.innerHTML = '';
		this.detailDivPermissionsUl.appendChild(document.createElement('li')).appendChild(document.createTextNode('filesystem'));
		this.detailDivPermissionsUl.appendChild(document.createElement('li')).appendChild(document.createTextNode('network'));
		this.detailDivPermissionsUl.appendChild(document.createElement('li')).appendChild(document.createTextNode('process'));

	}

	buildNode(nodeName, node) {

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
	hookNode(li, node) {

		li.addEventListener('mousedown', (event) => {

			let actionsOffset = this.xibleEditor.getOffsetPosition();
			let editorNode = this.xibleEditor.addNode(new XibleEditorNode(node));
			this.xibleEditor.loadedFlow.addNode(editorNode);
			editorNode.setPosition(((event.pageX - actionsOffset.left - this.xibleEditor.left) / this.xibleEditor.zoom) - (editorNode.element.firstChild.offsetWidth / 2), ((event.pageY - actionsOffset.top - this.xibleEditor.top) / this.xibleEditor.zoom) - (editorNode.element.firstChild.offsetHeight / 2));
			this.xibleEditor.deselect();
			this.xibleEditor.select(editorNode);
			this.xibleEditor.initDrag(event);

			this.close();

		});

	}

	fill() {

		//get the installed nodes
		let req = new OoHttpRequest('GET', `https://${xibleWrapper.hostname}:${xibleWrapper.port}/api/nodes`);
		req.toObject(Object).then((nodes) => {

			Object.keys(nodes).forEach((nodeName) => {

				let li = this.buildNode(nodeName, nodes[nodeName]);
				this.hookNode(li, nodes[nodeName]);
				this.nodesUl.appendChild(li);

			});

		});

	}

	position() {

		let clientRect = this.div.getBoundingClientRect();
		if (this.openTop) {
			this.div.style.top = (this.openYPosition - clientRect.height) + 'px';
		} else {
			this.div.style.top = this.openYPosition + 'px';
		}

		if (this.openLeft) {
			this.div.style.left = (this.openXPosition - clientRect.width) + 'px';
		} else {
			this.div.style.left = this.openXPosition + 'px';
		}

	}

	open() {

		//unhide all nodes,
		//so the correct height is checked against the window height and mouse pos
		//they will be hidden again later on
		Array.from(this.nodesUl.querySelectorAll('li.hidden')).forEach((li) => {
			li.classList.remove('hidden');
		});

		//track the positions where the selector was originally opened
		this.openXPosition = event.pageX;
		this.openYPosition = event.pageY;

		//unhide and position the nodeselector for the first overflow check
		this.div.classList.remove('hidden');
		this.div.style.left = this.openXPosition + 'px';
		this.div.style.top = this.openYPosition + 'px';

		//ensure we are not overflowing the chrome
		//this needs to be checked with a non-filtered list
		//otherwise changing the filter might still overflow y
		let clientRect = this.div.getBoundingClientRect();
		this.openTop = this.openLeft = false;
		if (clientRect.top + clientRect.height > window.innerHeight) {
			this.openTop = true;
		}
		if (clientRect.left + clientRect.width > window.innerWidth) {
			this.openLeft = true;
		}

		//focus!
		if (this.filterInput.value) {
			this.filterInput.select();
		}
		this.filterInput.focus();

		//filter the results
		if (this.filterInput.value) {
			Array.from(this.nodesUl.querySelectorAll('li')).forEach((li) => {

				if (this.filterInput.value && li.textContent.indexOf(this.filterInput.value) === -1) {
					li.classList.add('hidden');
				}

			});
		}

		//reposition
		if (this.openTop || this.openLeft) {
			this.position();
		}

	}

	close() {

		this.div.classList.add('hidden');
		this.detailDiv.classList.add('hidden');

	}

}
