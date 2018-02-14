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

require('file-loader?emit=false&name=[name].[ext]!./css/default.css');
require('file-loader?emit=false&name=[name].[ext]!./images/grid-100x100.png');

var Tome = require('@bjornstar/tomes');
var sm = require('../lib/sockmonger/client.js');

// These are our global variables.
var merging, welcome, view;

var myScryerId = window.localStorage.getItem('scryerId');
var myGoals;

var tDimension = Tome.conjure({});
var tGoals = Tome.conjure({});

window.dimension = tDimension;
window.goals = tGoals;

function handleOpen() {
	console.log('The portal is opening...');
	if (myScryerId) {
		login(myScryerId);
	}
}

function handleClose () {
	console.log('closed');
}

sm.on('close', handleClose);
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

function handleLoggedIn(scryerId) {
	console.log('loggedin', scryerId);
	window.localStorage.setItem('scryerId', scryerId);
	myScryerId = scryerId;
	finishLogin();
}

function finishLogin() {
	if (!myScryerId || !tGoals[myScryerId]) {
		return;
	}

	myGoals = tGoals[myScryerId];

	// Set up a listener for changes to our goals.
	myGoals.on('readable', handleMeReadable);
	myGoals.on('destroy', handleMeDestroy);

	welcome.hide();

	view.setRef(myGoals);
}

tGoals.once('add', finishLogin);

function login(id) {
	console.log('sending login:' + id);
	sm.remoteEmit('login', id);
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

	var scryerIds = Object.keys(tDimension.scryers);

	for (var i = 0; i < scryerIds.length; i += 1) {
		addScryer(scryerIds[i]);
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

function handleError(error) {
	console.error(error);
}

function register() {
	// Login as create to get a new scryer.
	console.log('emitting login:', 'create');
	sm.remoteEmit('login', 'create');
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

	sm.on('dimension', handleDimensionData);
	sm.on('dimension.diff', handleDimensionDiff);

	sm.on('goals', handleGoalsData);
	sm.on('goals.diff', handleGoalsDiff);

	sm.on('loggedIn', handleLoggedIn);

	sm.on('scryerError', welcome.showError);
	sm.on('error', handleError);
}

// Listen for the page to indicate that it's ready.
document.addEventListener('DOMContentLoaded', contentLoaded);
