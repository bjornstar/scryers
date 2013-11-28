// Copyright (C) 2013 Bjorn Stromberg
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.
//
//  _______  _______  ______    __   __  _______  ______    _______ 
// |       ||       ||    _ |  |  | |  ||       ||    _ |  |       |
// |  _____||       ||   | ||  |  |_|  ||    ___||   | ||  |  _____|
// | |_____ |       ||   |_||_ |       ||   |___ |   |_||_ | |_____
// |_____  ||      _||    __  ||_     _||    ___||    __  ||_____  |
//  _____| ||     |_ |   |  | |  |   |  |   |___ |   |  | | _____| |
// |_______||_______||___|  |_|  |___|  |_______||___|  |_||_______|
//

require('tome-log');

// We can require Tomes thanks to component.
var Tome = require('tomes').Tome;

// These are our global variables.
var merging, catSelect, view;

var myScryerId = window.localStorage.getItem('scryerId');
var myGoals;

var tDimension = Tome.conjure({});
var tGoals = Tome.conjure({});

window.dimension = tDimension;
window.goals = tGoals;

var ws = new WebSocket(window.config.wsurl);

function handleOpen() {
	console.log('The portal is opening...');
	if (myScryerId) {
		login();
	} else {
		console.log('I have not seen you before.');
	}
}

ws.onopen = handleOpen;

function l(something) {
	console.log(something);
}

var socket = {
	on: l,
	emit: l
};

// This is our click handler.
function handleNewCoords(newX, newY) {
	// Do you exist yet?
	if (!myGoals) {
		return;
	}

	// We update our position and it gets automatically distributed to all the
	// other users thanks to the magic of tomes.

	myGoals.pos.x.assign(newX);
	myGoals.pos.y.assign(newY);
}

function handleMeDestroy() {
	// If we got destroyed it's because the server restarted, let's log in
	// again with our scryerId.

	console.log('I was destroyed.');

	login();
}

function handleMeReadable() {
	// This is the magic of tomes. Whenever we make changes to our cat, we send
	// that to the server.

	// We set merging to true when we receive data from the server. Since we
	// are getting changes from the server, we don't need to send that back.

	if (merging) {
		return;
	}

	// Get the changes
	var diff = this.read();

	if (diff) {
		// Send them to the server.
		socket.emit('diff', diff);
	}
}

function handleChatInput(e) {
	// When you press enter (keycode 13) and there is text in the chat box.
	var chatText = this.value;
	if (e.keyCode === 13 && chatText.length) {
		// Push the text onto our chat object. Remember, any changes we make
		// automatically get sent to the server so we don't have to do anything
		// else.
		myGoals.chat.push(chatText);

		// clear the chat box.
		this.value = '';
		
		return false;
	}
	return true;
}

function setupChatHooks() {
	// Setup a listener for the chat box.
	var chatinput = document.getElementById('chat');
	chatinput.addEventListener('keypress', handleChatInput);

	window.addEventListener('keypress', function (e) {
		if (e.target === chatinput || e.ctrlKey || e.altKey) {
			return;			
		}

		var code = e.keyCode || e.charCode;
		chatinput.focus();
		chatinput.value += String.fromCharCode(code);
		e.preventDefault();
	});

	// Set keyboard focus to the chat box.
	chatinput.focus();
}

function handleRegistered(scryerId) {
	window.localStorage.setItem('scryerId', scryerId);
	myScryerId = scryerId;

	login();
}

function finishLogin() {
	myGoals = tGoals[myScryerId];

	// Set up a listener for changes to our goals.
	myGoals.on('readable', handleMeReadable);
	myGoals.on('destroy', handleMeDestroy);

	catSelect.hide();

	// Setup the chat box event handlers.
	setupChatHooks();

	view.setRef(myGoals);
}

function addScryer(scryerId) {
	// A scryer joined our dimension.

	var scryer = tDimension.scryers[scryerId];

	// Add the cat to the view, the views are responsible for hooking up
	// events.
	view.addCat(scryer);
}

function handleDimensionData(data) {
	// When we connect to the server, the server sends us a copy of the
	// dimension.
	console.log('got dimension:', data);
	// If we already have a dimension we can just assign over it and
	// everything gets cleaned up automatically.
	tDimension.assign(data);

	// Go through the list of scryers in the dimension and add them to our
	// dimension.
	for (var scryerId in tDimension.scryers) {
		if (tDimension.scryers.hasOwnProperty(scryerId)) {
			addScryer(scryerId);
		}
	}

	// And add a listener for more scryers to join the party.
	tDimension.scryers.on('add', addScryer);
}

var loginWatcher = tGoals.on('add', function (id) {
	if (id !== myScryerId) {
		return;
	}

	finishLogin();
});


function handleGoalData(data) {
	console.log('got goals:', data);
	tGoals.assign(data);
}

function handleDimensionDiff(diff) {
	// The server sends us updates to our dimension. We cannot affect the
	// dimension directly, we communiate our desires through our handle in the
	// goals Tome
	console.log('got dimension diff:', diff);
	// We merge the diff into our dimension.
	tDimension.merge(diff);

	// And throw away the diffs generated when we merged the data.
	tDimension.readAll();
}

function handleGoalsDiff(diff) {
	// Goals update in realtime according to the fickle whims of the scryers in
	// our dimension. We can attempt to influence our dimension by modifying
	// our goals here.
	console.log('got goals diff:', diff);
	merging = true;

	tGoals.merge(diff);
	tGoals.readAll();

	merging = false;
}

function login() {
	console.log('sending login:' + myScryerId);
	ws.send('login:' + JSON.stringify(myScryerId));
}

function register(name, catType, propType, pos) {
	// Register our scryer's details. The server will either emit an error. On
	// success, the server will emit our scryerId.
	console.log('emitting register:', name, catType, propType, pos);
	socket.emit('register', name, catType, propType, pos);
}

function parseData(data) {
	var colonIndex = data.indexOf(':');
	var n = data.substring(0, colonIndex);
	var d = JSON.parse(data.substring(colonIndex + 1));
	return { name: n, data: d };
}

var eventHandlers = {}

function handleMessage(event) {
	var evt = parseData(event.data);
	eventHandlers[evt.name](evt.data);
}

ws.onmessage = handleMessage;

function contentLoaded() {
	// The page has loaded completely, we can start.

	catSelect = require('./catselect').CatSelect();

	catSelect.on('register', register);
	
	// Look at our URL and see if we want CSS or Canvas
	if (window.location.href.match(/#canvas/i)) {
		var CanvasView = require('./canvasView').CanvasView;
		view = new CanvasView();
	} else {
		var CssView = require('./cssView').CssView;
		view = new CssView();
	}

	view.on('newCoords', handleNewCoords);

	window.scrollTo(0,1);

	if (window.config && window.config.hasOwnProperty('google-analytics')) {
		require('ga')(window.config['google-analytics']);
	}

	eventHandlers = {
		dimension: handleDimensionData,
		goals: handleGoalData,
		dimensionDiff: handleDimensionDiff,
		goalsDiff: handleGoalsDiff,
		registered: handleRegistered,
		scryerError: catSelect.showError
	};
}

// Listen for the page to indicate that it's ready.
document.addEventListener("DOMContentLoaded", contentLoaded);
