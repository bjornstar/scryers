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

//require('tome-log');

// We can require Tomes thanks to component.
var Tome = require('tomes').Tome;

// These are our global variables.
var merging, welcome, view;

var myScryerId = window.localStorage.getItem('scryerId');
var myGoals;

var tDimension = Tome.conjure({});
var tGoals = Tome.conjure({});

// In development mode we stick em on the window for easy access.
if (window.config.developmentMode) {
	window.dimension = tDimension;
	window.goals = tGoals;
}

var sm = require('sockMonger');

function handleOpen() {
	console.log('The portal is opening...');
	if (myScryerId) {
		login();
	} else {
		console.log('You must be new here, what\'s your name?');
	}
}

sm.on('open', handleOpen);

// This is our click handler.
function handleNewCoords(newX, newY) {
	// Do you exist yet?
	if (!myGoals) {
		return;
	}

	// We update our position and it gets automatically distributed to all the
	// other users thanks to the magic of tomes.

	var newPos = { x: newX, y: newY };

	if (!myGoals.pos.x.is(newX) || !myGoals.pos.y.is(newY)) {
		myGoals.pos.assign(newPos);
	}
}

function handleMeDestroy() {
	// If we got destroyed it's because the server restarted, let's log in
	// again with our scryerId.

	console.log('I was destroyed.');

	myGoals.removeAllListeners();
}

function handleMeReadable() {
	// This is the magic of tomes. Whenever we make changes to our goal, we send
	// that to the server.

	// We set merging to true when we receive data from the server. Since we
	// are getting changes from the server, we don't need to send that back.

	if (merging) {
		return;
	}

	// Get the changes
	var diff = this.read();

	if (!diff) {
		return;
	}

	// Send them to the server.
	sm.remoteEmit('diff', diff);
}

function finishLogin() {
	myGoals = tGoals[myScryerId];

	// Set up a listener for changes to our goals.
	myGoals.on('readable', handleMeReadable);
	myGoals.on('destroy', handleMeDestroy);

	welcome.hide();

	view.setRef(myGoals);
}

var watchForMyGoals = tGoals.on('add', function (id) {
	if (!myScryerId || id !== myScryerId) {
		return;
	}

	tGoals.removeListener('add', watchForMyGoals);
	finishLogin();
});

function login() {
	console.log('sending login:' + myScryerId);
	sm.remoteEmit('login', myScryerId);
}

function handleRegistered(scryerId) {
	window.localStorage.setItem('scryerId', scryerId);
	myScryerId = scryerId;

	login();
}

function addScryer(scryerId) {
	// A scryer joined our dimension.

	var scryer = tDimension.scryers[scryerId];

	view.addPortal(scryer.portal);

	scryer.whims.on('add', function (whimId) {
		view.addWhim(this[whimId]);
	});
}

function handleDimensionData(data) {
	// When we connect to the server, the server sends us a copy of the
	// dimension.

	console.log('got dimension:', data);

	// If we already have a dimension we can just assign over it and
	// everything gets cleaned up automatically.
	tDimension.assign(data);

	tDimension.on('readable', function () {
		tDimension.read();
	});

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

function handleGoalsData(data) {
	console.log('got goals:', data);

	merging = true;
	tGoals.assign(data);
	tGoals.read();
	merging = false;
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

function register(name) {
	// Register our scryer's details. The server will either emit an error. On
	// success, the server will emit our scryerId.

	var data = { name: name };

	console.log('emitting register:', data);
	sm.remoteEmit('register', data);
}

function contentLoaded() {
	// The page has loaded completely, we can start.

	welcome = require('./welcome').Welcome();

	welcome.on('register', register);

	// Look at our URL and see if we want CSS or Canvas
	if (window.location.href.match(/#canvas/i)) {
		var CanvasView = require('./canvasView').CanvasView;
		view = new CanvasView();
	} else {
		var CssView = require('./cssView').CssView;
		view = new CssView();
	}

	view.on('newCoords', handleNewCoords);

	tGoals.on('add', function (scryerId) {
		view.addGoal(tGoals[scryerId]);
	});

	window.scrollTo(0,1);

	if (window.config && window.config.hasOwnProperty('google-analytics')) {
		require('ga')(window.config['google-analytics']);
	}

	sm.on('dimension', handleDimensionData);
	sm.on('dimension.diff', handleDimensionDiff);

	sm.on('goals', handleGoalsData);
	sm.on('goals.diff', handleGoalsDiff);

	sm.on('registered', handleRegistered);

	sm.on('scryerError', welcome.showError);
}

// Listen for the page to indicate that it's ready.
document.addEventListener("DOMContentLoaded", contentLoaded);
