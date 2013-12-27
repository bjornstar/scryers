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
var express = require('express');
var Tome = require('tomes').Tome;

var appConfig = require('./config/');
var build = require('./build/');
var analytics = require('./analytics/');
var move = require('./lib/move');
var SockMonger = require('./lib/sockMonger');
var Scryer = require('./lib/scryer');

// Heroku uses PORT
// AppFog uses VCAP_APP_PORT

var port = process.env.PORT || process.env.VCAP_APP_PORT || 3000;

var tDimension = Tome.conjure({ turn: 0, scryers: {} });
var tGoals = Tome.conjure({});

var tClients = Tome.conjure({});
var scryerClientMap = {};
var newThisTurn = {};

var merging;

function msToNextTurn() {
	return Date.now() % appConfig.msPerTurn || 1000;
}

var nextTurnTimeout;

// This holds all of the whims that need to move.
var moving = {};

function nextTurn() {
	move(moving);

	sendTurn();

	nextTurnTimeout = setTimeout(nextTurn, msToNextTurn());
}

function delClient(clientId) {
	console.log(clientId + ' disconnected.');

	delete newThisTurn[clientId];

	// Delete the client from the map, triggering the removal of the player
	// from the dimension.
	var scryerId = tClients[clientId];

	if (!scryerId) {
		return;
	}

	delete scryerClientMap[scryerId];

	tClients.del(clientId);
}

function mergeGoal(diff) {
	var clientId = this.id;

	// If we got a diff from a strange client, just ignore it.
	if (!tClients[clientId].is()) {
		console.log('Invalid client:', clientId)
		return;
	}

	if (!diff) {
		console.log('empty diff');
		return;
	}

	merging = true;

	// Merge the diff
	tGoals.merge(diff);

	// Throw away the diff since we don't want to do anything with it.
	tGoals.read();

	merging = false;

	// We can simply broadcast the diff which sends it to all clients except
	// for the one that sent it.
	this.broadcast('goals.diff', diff);
}

function newGoalPos() {
	var scryerId = this.getParent().getKey();
	var scryer = tDimension.scryers[scryerId];

	for (var whimId in scryer.whims) {
		if (scryer.whims.hasOwnProperty(whimId)) {
			var whim = scryer.whims[whimId];
			moving[whimId] = { pos: whim.pos, goal: this, speed: whim.speed };

			// If our whim gets deleted while it's moving, we need to remove it
			// from the moving list.

			whim.on('destroy', function () {
				delete moving[whimId];
			});
		}
	}
}

function logout(scryerId) {
	tDimension.scryers[scryerId].set('lastlogout', Date.now());

	Scryer.save(tDimension.scryers[scryerId], function(error) {
		if (error) {
			console.log('error saving:', scryerId, error)
		}

		tDimension.scryers.del(scryerId);
		tGoals.del(scryerId);

		analytics.track({ userId: scryerId, event: 'disconnected' });
	});
}

function handleLogin(scryerId) {
	var client = this;
	var clientId = this.id;

	var currentClient = scryerClientMap[scryerId]

	if (currentClient) {
		console.log(clientId, 'took over', currentClient);
		scryerClientMap[scryerId] = clientId;
		tClients.move(currentClient, clientId);
		sm.clients[currentClient].close();
		return;
	}

	Scryer.load(scryerId, function (error, scryerData) {
		if (error) {
			console.log('error: ', error);
			return client.remoteEmit('scryerError', error);
		}

		// It's possible that the client has disconnected before their data
		// could finish being read. In that case, return early.

		if (!tClients.hasOwnProperty(clientId)) {
			console.log('client disconnected before data loaded.', clientId, scryerId);
			return;
		}

		var goalData = {
			pos: scryerData.portal
		};

		// Sneakily bump the lastseen before it gets turned into a tome.
		scryerData.lastlogin = Date.now();

		// Add the scryer to our scryers tome and all clients will automagically
		// get updated at the end of this turn.
		tDimension.scryers.set(scryerId, scryerData);

		// Add the goal to our goals tome, which gets updated in realtime.
		tGoals.set(scryerId, goalData);

		tGoals[scryerId].pos.on('readable', newGoalPos);

		// Map the scryerId to clientId so we know which client belongs to which
		// scryer.
		tClients[clientId].assign(scryerId);

		tClients[clientId].on('destroy', function () {
			console.log(clientId, 'disconnected. logging out', scryerId, '.');
			logout(scryerId);
		});

		scryerClientMap[scryerId] = clientId;

		// And tell the client who is logging in what their scryerId is.
		client.remoteEmit('loggedIn', scryerId);
	});
}

function handleRegister(data) {
	console.log(this.id + ': register as', data);

	var newScryer = Scryer.create(data);
	var client = this;

	Scryer.save(newScryer, function (error) {
		if (error) {
			console.log('error saving new scryer', error);
			return client.remoteEmit('scryerError', error);
		}

		client.remoteEmit('registered', newScryer.id);

		analytics.identify({ userId: newScryer.id, traits: { name: newScryer.name } });
	});
}

function addClient(clientId) {
	console.log(clientId, 'connected.');

	newThisTurn[clientId] = tDimension.getVersion();

	tClients.set(clientId, '');

	var client = sm.clients[clientId];

	// When a client connects, we send them a copy of the dimension. This is
	// synchronized once per turn.
	client.remoteEmit('dimension', tDimension);

	// We also send them the goals tome. This is synchronized in realtime and
	// is how scryers can influence the dimension.
	client.remoteEmit('goals', tGoals);

	// On diff, the client sent us a change to their goal.
	client.on('diff', mergeGoal);

	// On login, the client is trying to login.
	client.on('login', handleLogin);

	// On register, the client needs to create an account.
	client.on('register', handleRegister);
}

function isNumber (o) {
	// For checking if the port is a number or a file.
	if (typeof o === 'number' || parseInt(o, 10) == o) {
		return true;
	}
	return false;
}

var gameExpress = express();

// See that build in there? When the client requests the index page, we build
// the client scripts, then serve the html.
gameExpress.get('/', build, function (req, res) {
	res.sendfile('./client/index.html');
});

// The built client javascript files end up here.
gameExpress.get('/js/:js', function (req, res) {
	var js = req.params.js
	res.sendfile('./public/' + js);
});

// CSS files served from /client/css
gameExpress.get('/css/:css', function (req, res) {
	var css = req.params.css;
	res.sendfile('./client/css/' + css);
});

// Images served from /client/images
gameExpress.get('/images/:image', function (req, res) {
	var image = req.params.image;
	res.sendfile('./client/images/' + image);
});

// Audio files served from /client/audio
gameExpress.get('/audio/:audio', function (req, res) {
	var audio = req.params.audio;
	res.sendfile('./client/audio/' + audio);
});

// This starts our express web server listening on either a port or a socket.
var gameServer = gameExpress.listen(port, function () {
	if (!isNumber(port)) {
		var that = this;

		// If it's a socket, we want to chmod it so nginx can see it and we
		// also want to close the port so the sock file gets cleaned up.

		require('fs').chmod(port, parseInt('777', 8));

		process.on('SIGINT', that.close);

		process.on('uncaughtException', function (error) {
			that.close();

			console.error(error);

			process.exit(1);
		});
	}
});

var sm = new SockMonger({ server: gameServer });
sm.on('add', addClient);
sm.on('del', delClient);

function handleGoalsReadable() {
	// If we are merging we will use broadcast to send the diff to all clients
	// except for the one who sent it.

	if (merging || !tGoals.isDirty()) {
		return;
	}

	var diffs = tGoals.readAll();

	if (!diffs) {
		return;
	}

	sm.broadcast('goals.diff', diffs);
}

tGoals.on('readable', handleGoalsReadable);

function sendTurn() {
	if (!tDimension.isDirty()) {
		return;
	}

	var currentVersion = tDimension.getVersion();

	var diffs = tDimension.readAll();

	var exclude = [];

	for (var newId in newThisTurn) {
		exclude.push(newId);

		var trimmedDiffs = diffs.slice(diffs.length - (currentVersion - newThisTurn[newId]));
		sm.clients[newId].remoteEmit('dimension.diff', trimmedDiffs);
	}

	newThisTurn = {};

	sm.broadcast('dimension.diff', diffs, exclude);
}

// Start the turnEngine.
nextTurn();