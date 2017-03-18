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
		detailDiv.innerHTML = `
			<div id="nodePackSub"></div>
			<button id="nodePackConfirmButton" type="button">Confirm</button>
			<button id="nodePackCancelButton" type="button" class="cancel">Cancel</button>
		`;

		this.detailDivSub = document.getElementById('nodePackSub');
		this.detailConfirmButton = document.getElementById('nodePackConfirmButton');
		document.getElementById('nodePackCancelButton').onclick = () => {
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

			let filterInputValue = filterInput.value.toLowerCase();
			let searchWords = this.getSearchWords();

			let noResults = true;
			nodesUl.querySelectorAll('li').forEach((li) => {
				if (this.setListVisibility(li, filterInputValue, searchWords)) {
					noResults = false;
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
		let searchOnlineButton = this.searchOnlineButton = div.appendChild(document.createElement('button'));
		searchOnlineButton.setAttribute('type', 'button');
		searchOnlineButton.appendChild(document.createTextNode('search online'));
		searchOnlineButton.setAttribute('title', 'Search xible.io for nodes matching your filter');
		searchOnlineButton.addEventListener('click', (event) => {

			if (!filterInput.value) {
				return;
			}

			let filterInputValue = filterInput.value.toLowerCase();
			let searchWords = this.getSearchWords();

			this.detailDiv.classList.add('hidden');
			searchOnlineButton.classList.add('loading');

			//query the registry
			xibleWrapper.Registry
				.searchNodePacks(filterInput.value)
				.then((nodePacks) => {

					//clear all non-online results
					let foundResults = !!Object.keys(nodePacks).length;
					if (foundResults) {

						nodesUl.querySelectorAll('li:not(.online)').forEach((li) => {
							li.classList.add('hidden');
						});

						div.classList.remove('noresults');

					} else {
						div.classList.add('noresults');
					}

					//print the li's belonging to the found nodePacks
					let noResults = true;
					for (let nodePackName in nodePacks) {

						let nodePack = nodePacks[nodePackName];
						for (let i = 0; i < nodePack.nodes.length; ++i) {

							//check if this nodeName doesn't already exist in the list
							let nodeName = nodePack.nodes[i].name;
							if (nodesUl.querySelector(`li h1[title="${nodeName}"]`)) {
								continue;
							}

							let li = this.buildNode(nodeName, nodePack.nodes[i]);
							li.classList.add('online');
							li.onclick = (event) => {

								//open the detailed confirmation view
								this.detailedNodeView(li, nodePack, nodeName);

							};
							nodesUl.appendChild(li);

							//ensure only those li's are visible that match the search criteria
							if (this.setListVisibility(li, filterInputValue, searchWords)) {
								noResults = false;
							}

						}

					}

					if (noResults) {
						div.classList.add('noresults');
					} else {
						div.classList.remove('noresults');
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

				this.open(event);
				event.preventDefault();
				return false;

			}

		});

		//open the node menu on double click
		document.body.addEventListener('dblclick', (event) => {

			if (!event.ctrlKey && this.xibleEditor.loadedFlow && (event.target === this.xibleEditor.element || event.target === this.xibleEditor.element.firstChild)) {
				this.open(event);
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

	getSearchWords() {
		return this.filterInput.value.toLowerCase().replace(/[\W_]+/g, ' ').split(' ');
	}

	/**
	 *	Changes the visibility on a node in the list, based on the search conditions
	 *	@param {HTMLElement} li
	 *	@param {String} filterInputValue the search value
	 *	@param {String[]} searchWords the search keywords
	 *	@returns {Boolean} visible or no
	 */
	setListVisibility(li, filterInputValue, searchWords) {

		let textContent = li.textContent.toLowerCase();

		li.classList.remove('headerMatchExact', 'headerMatchPartial');
		if (!filterInputValue || searchWords.every((searchWord) => textContent.indexOf(searchWord) > -1)) {

			//specify more relevant search results
			let headerTextContent = li.firstChild.textContent.toLowerCase();
			if (headerTextContent === filterInputValue) {
				li.classList.add('headerMatchExact');
			} else if (searchWords.every((searchWord) => headerTextContent.indexOf(searchWord) > -1)) {
				li.classList.add('headerMatchPartial');
			}

			li.classList.remove('hidden');
			return true;

		}

		li.classList.add('hidden');
		return false;

	}

	detailedNodeView(li, nodePack, nodeName) {

		//set confirm button action
		this.detailConfirmButton.disabled = false;
		this.detailConfirmButton.onclick = () => {

			this.detailConfirmButton.disabled = true;
			this.detailConfirmButton.classList.add('loading');
			li.classList.add('loading');

			xibleWrapper.Registry
				.installNodePackByName(nodePack.name)
				.then(() => {

					this.detailConfirmButton.disabled = false;
					this.detailConfirmButton.classList.remove('loading');

					this.detailDiv.classList.add('hidden');

					//track all nodeNames currently visible
					let visibleNodeNames = Array.from(this.nodesUl
							.querySelectorAll(`li:not(.hidden) h1`))
						.map((header) => header.getAttribute('title'));

					//refill
					this.fill().then(() => {

						//hide all items
						Array.from(this.nodesUl.querySelectorAll('li')).forEach((li) => {
							li.classList.add('hidden');
						});

						//make items visible that were so before
						visibleNodeNames.forEach((nodeName) => {

							let h1 = this.nodesUl.querySelector(`li h1[title="${nodeName}"]`);
							if (h1) {
								h1.parentNode.classList.remove('hidden');
							}

						});

					});

				});

		};

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

		//fill data
		this.detailDivSub.innerHTML = `
			<section>
				<h1>${nodeName}</h1>
				<p>This node is part of nodepack "${nodePack.name}". By installing, all contents of this nodepack will be installed.</p>
			</section>
			<section>
				<h1>publish user</h1>
				<p>This node pack is published by user "${nodePack.publishUserName}"</p>
			</section>
			<section>
				<h1>nodes</h1>
				<ul>
					${nodePack.nodes
						.map((node) => `<li>${node.name}</li>`)
						.join('')}
				</ul>
			</section>
			<section>
				<h1>own risk</h1>
				<p>Installation and usage of these nodes is at your own risk.</p>
			</section>
		`;

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

		this.nodesUl.innerHTML = '';

		//get the installed nodes
		let req = xibleWrapper.httpBase.request('GET', `http${xibleWrapper.baseUrl}/api/nodes`);
		return req.toJson().then((nodes) => {

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

	open(event) {

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

		this.detailConfirmButton.classList.remove('loading');
		this.searchOnlineButton.classList.remove('loading');

	}

}
