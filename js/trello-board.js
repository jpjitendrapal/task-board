
(function () {
	'use strict'
	var currentBoard;
	var dragTracker =
		{
			id: undefined,
			list: undefined
		}

	//This function will add the Card in the list
	function addCardTrello(list) {
		return function () {
			var titleTextarea = list.titleFormNode.getElementsByClassName('trello-new-card-title-input')[0];
			list.titleFormNode.getElementsByClassName('trello-new-card-title-submit')[0].onclick = titleSubmit;
			// list.titleFormNode.getElementsByClassName('trello-card-update')[0].onclick = titleUpdate;
			list.titleFormNode.style.display = 'block';
			titleTextarea.focus();

			function titleSubmit(evt) {
				evt.preventDefault()
				var title = titleTextarea.value.trim()
					, card;

				list.titleFormNode.style.display = 'none';
				titleTextarea.value = '';
				if (!title) {
					return
				}

				card = new Card(list, title);
				list.board.registerCard(card, list.cards.length);
				list.cardsNode.insertBefore(card.node, list.cards[list.cards.length - 1].node);
				list.cards.push(card);
			}
		}
	}

	//this function will build the card node
	function buildCardNode() {
		var node = document.createElement('div');
		node.draggable = true;
		node.innerHTML =
			'<div class="card-title"></div>' +
			'<div class="for-card-edit"><input class="card-edit-box" type="text"/>' +
			'<button class="card-update">Save</button>' +
			'<button class="card-edit-delete">X</button>' +
			'</div>';
		return node;
	}
	
	// This function is constructor function for card
	function Card(list, title) {
		this.id = list.board.getNextId()
		this.list = list
		this.title = title
		this.node = buildCardNode()
		this.titleNode = this.node.getElementsByClassName('card-title')[0]
		this.editNode = this.node.getElementsByClassName('for-card-edit')[0];
		this.editNodeBox = this.node.getElementsByClassName('card-edit-box')[0];
		this.updateBtn = this.node.getElementsByClassName('card-update')[0];
		this.deleteBtn = this.node.getElementsByClassName('card-edit-delete')[0];
		this.node.classList.add('card')
		this.node.setAttribute('card-id', this.id)
		this.titleNode.appendChild(document.createTextNode(this.title))
		this.editNodeBox.value = title;
		this.editNode.style.display = 'none';
		/*
		 These four function will work on drag and drop of the card on another list
		 */
		this.node.ondragstart = (function (id) {
			return function (evt) {
				dragTracker.id = id
				evt.dataTransfer.effectAllowed = 'move'
			}
		}(this.id))

		this.node.ondragover = function (evt) {
			if (dragTracker.id) {
				evt.preventDefault()
			}
		}

		// when dropping the dragged card
		this.node.ondrop = (function (board) {
			return function (evt) {
				var id = dragTracker.id
					, targetId = this.getAttribute('card-id') // 'this' is target of drop
					, source = board.cards[id]
					, target = board.cards[targetId]

				if (id === targetId) {
					return
				}

				source.list.cardsNode.removeChild(source.card.node);  // removing card from source
				target.list.cardsNode.insertBefore(source.card.node, target.card.node); // adding card in target

				board.reregisterSubsequent(source.list, source.index + 1, -1); // re register cards in source
				source.list.cards.splice(source.index, 1); // remove from source array

				board.reregisterSubsequent(target.list, target.index + 1, 1); // re register cards on target
				target.list.cards.splice(target.index + 1, 0, source.card); // adding source crad in target cards array

				source.card.list = target.list; // updating current list with the target
				board.registerCard(source.card, target.index + 1); // register the card
				evt.preventDefault()
			}
		}(list.board));

		this.node.ondragend = function () {
			dragTracker.id = undefined;
		}

		// this function will be called when clicked on delete button of card
		this.deleteBtn.onclick = (function (card) {
			return function (evt) {
				var index = currentBoard.cards[card.id].index;
				currentBoard.unregisterCard(card);
				currentBoard.reregisterSubsequent(card.list, index + 1, -1);
				card.list.cardsNode.removeChild(card.node);
				card.list.cards.splice(index, 1);
				evt.stopPropagation();
			};
		})(this);

		// this function will be called when clicked on save button of card
		this.updateBtn.onclick = (function (card) {
			return function (evt) {
				var newTitleNode = document.createTextNode(card.editNodeBox.value);
				card.titleNode.replaceChild(newTitleNode, card.titleNode.childNodes[0]);
				card.editNode.style.display = 'none';
				card.titleNode.style.display = 'block';
				evt.stopPropagation();
			};
		})(this);


		// this function will be called once you click on the text to edit
		this.node.onclick = (function (card) {
			return function () {
				card.editNode.style.display = 'block';
				card.titleNode.style.display = 'none';
				card.editNodeBox.focus();
			};
		}(this));
	}

	// List class to create list in the board
	function List(board, title, index, dummyList) {
		this.board = board;
		this.title = title;
		this.index = index;
		this.node = document.createElement('div');
		this.titleNode = document.createElement('div');
		this.cardsNode = document.createElement('div');
		this.node.classList.add('list');
		this.titleNode.classList.add('list-title');
		this.cardsNode.classList.add('list-cards');
		this.titleNode.setAttribute('list-index', index);
		this.titleNode.appendChild(document.createTextNode(this.title));
		this.node.appendChild(this.titleNode);

		//This function is called to build the card form
		function buildCardTitleForm() {
			var node = document.createElement('form')
			node.innerHTML =
				'<div class="newitem-title-wrapper">' +
				'<textarea class="trello-new-card-title-input" type="text"></textarea>' +
				'<input class="trello-new-card-title-submit" type="submit" value="Add">' +
				'</div>'
			node.style.display = 'none'
			return node
		}

		if (!dummyList) {
			var dummyCard = new Card(this, 'Add new card...', 0);

			this.titleNode.draggable = true;
			this.cards = [dummyCard];
			board.registerCard(this.cards[0], 0);

			// new card title form
			this.titleFormNode = buildCardTitleForm()

			for (var i = 0; i < this.cards.length; ++i) {
				this.cardsNode.appendChild(this.cards[i].node)
			}
			dummyCard.titleNode.onclick = addCardTrello(this)
			this.node.appendChild(this.cardsNode)
			dummyCard.node.appendChild(this.titleFormNode)
			dummyCard.node.draggable = false
			dummyCard.node.onclick = undefined
		}

		// drag-drop handlers
		this.titleNode.ondragstart = function (evt) {
			var index = parseInt(evt.target.getAttribute('list-index'), 10)
			dragTracker.list = currentBoard.lists[index]
			evt.dataTransfer.effectAllowed = 'move'
		}

		this.titleNode.ondragover = function (evt) {
			if (dragTracker.list) {
				evt.preventDefault()
			}
		}

		this.titleNode.ondrop = function (evt) {
			var sourceIndex = dragTracker.list.index
				, targetIndex = parseInt(this.getAttribute('list-index'), 10)
				, numLists = board.lists.length
				, i

			if (sourceIndex === targetIndex) { return }

			board.listsNode.removeChild(dragTracker.list.node)
			board.listsNode.insertBefore(dragTracker.list.node,
				board.lists[targetIndex].node)

			for (i = sourceIndex; i < numLists - 1; ++i) {
				board.lists[i] = board.lists[i + 1]
				board.lists[i].titleNode.setAttribute('list-index', i)
				board.lists[i].index = i
			}
			for (i = numLists - 1; i > targetIndex; --i) {
				board.lists[i] = board.lists[i - 1]
				board.lists[i].titleNode.setAttribute('list-index', i)
				board.lists[i].index = i
			}
			board.lists[targetIndex] = dragTracker.list
			board.lists[targetIndex].titleNode.setAttribute('list-index', targetIndex)
			board.lists[targetIndex].index = targetIndex
			evt.preventDefault()
		}

		this.titleNode.ondragend = function () {
			dragTracker.list = undefined
		}
	}

	//This function will called on adding the list on the board
	function addListTrello(board) {
		return function () {
			var titleInput = document.getElementById('trello-list-title-input')

			document.getElementById('trello-list-title-submit').onclick = titleButtonClick;
			board.titleFormNode.style.display = 'block';
			titleInput.focus();

			function titleButtonClick(evt) {
				evt.preventDefault();
				var title = titleInput.value.trim()
					, index = board.lists.length - 1
					, list
					;

				board.titleFormNode.style.display = 'none';
				titleInput.value = '';
				if (!title) {
					return
				}

				list = new List(board, title, index);
				board.lists.splice(index, 0, list);
				board.listsNode.insertBefore(list.node, board.lists[index + 1].node);
				board.lists[index + 1].titleNode.setAttribute('list-index', index + 1);
			}
		}
	}

	//Board constructor object and assign some properties to its prototype
	function Board(title) {
		var nextId = 0;
		this.title = title;
		this.lists = [];
		this.cards = {};

		this.node = document.createElement('div');
		this.titleNode = document.createElement('div');
		this.listsNode = document.createElement('div');
		this.node.id = 'board';
		this.titleNode.id = 'trello-title-board';
		this.listsNode.id = 'trello-canvas-board';

		// new list title form
		this.titleFormNode = buildListTitleForm();
		this.titleNode.appendChild(document.createTextNode(this.title));

		this.getNextId = function () {
			return '_' + (nextId++).toString();
		}

		/*
		This function will build the form for list,It is called by addList
		*/
		function buildListTitleForm() {
			var node = document.createElement('form');
			node.innerHTML =
				'<div class="newitem-title-wrapper">' +
				'<input id="trello-list-title-input" type="text">' +
				'<input id="trello-list-title-submit" type="submit" value="Save">' +
				'</div>';
			node.style.display = 'none';
			return node
		}

	}
	Board.prototype.render = function () {
		this.lists.push(new List(this, 'Add a list...', 0, true))
		for (var i = 0; i < this.lists.length; ++i) {
			this.listsNode.appendChild(this.lists[i].node);
		}
		this.lists[this.lists.length - 1].node.appendChild(this.titleFormNode);
		this.lists[this.lists.length - 1].titleNode.onclick = addListTrello(this);
		this.node.appendChild(this.titleNode);
		this.node.appendChild(this.listsNode);
	}
	Board.prototype.registerCard = function (card, index) {
		this.cards[card.id] =
			{
				card: card
				, list: card.list
				, index: index
			}
	}
	Board.prototype.reregisterSubsequent = function (list, index, shift) {
		for (var i = index; i < list.cards.length; ++i) {
			this.registerCard(list.cards[i], i + shift);
		}
	}
	Board.prototype.unregisterCard = function (card) {
		delete this.cards[card.id];
	}

	//Onloading the document render the board.The code starts from here
	document.body.onload = function () {
		var title = 'Trello Board'
			, board = new Board(title);

		board.render();
		document.getElementById('container').appendChild(board.node);
		currentBoard = board;
	}
}());
