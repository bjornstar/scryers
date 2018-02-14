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
var HtmlWebpackPlugin = require('html-webpack-plugin');
var path = require('path');
var Tome = require('@bjornstar/tomes');
var webpack = require('webpack');
var webpackDevMiddleware = require('webpack-dev-middleware');

var appConfig = require('./config/');
var move = require('./lib/move');
var SockMonger = require('./lib/sockmonger');
var Scryer = require('./lib/scryer');

var port = appConfig.port || 3000;

var tDimension = Tome.conjure({ turn: 0, scryers: {} });
var tGoals = Tome.conjure({});

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
}

function mergeGoal(diff) {
	var clientId = this.id;

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

	var whimIds = Object.keys(scryer.whims);

	for (var i = 0; i < whimIds.length; i += 1) {
		var whimId = whimIds[i];
		var whim = scryer.whims[whimId];

		moving[whimId] = { pos: whim.pos, goal: this, speed: whim.speed };

		// If our whim gets deleted while it's moving, we need to remove it
		// from the moving list.

		whim.on('destroy', function () {
			delete moving[whimId];
		});
	}
}

function login(client, scryer) {
	var clientId = client.id;
	var scryerId = scryer.data.id;

	var publicData = scryer.data.public;

	var goalData = {
		pos: publicData.portal
	};

	// Sneakily bump the lastseen before it gets turned into a tome.
	publicData.lastlogin = Date.now();

	// Add the scryer to our scryers tome and all clients will automagically
	// get updated at the end of this turn.
	tDimension.scryers.set(scryerId, publicData);

	// Add the goal to our goals tome, which gets updated in realtime.
	tGoals.set(scryerId, goalData);

	tGoals[scryerId].pos.on('readable', newGoalPos);

	client.once('close', function () {
		console.log(clientId, 'disconnected. logging out', scryerId, '.');

		tDimension.scryers[scryerId].set('lastlogout', Date.now());

		scryer.save(function(error) {
			if (error) {
				console.log('error saving:', scryerId, error)
			}

			tDimension.scryers.del(scryerId);
			tGoals.del(scryerId);
		});
	});

	// Tell the client who is logging in what their scryerId is.
	client.remoteEmit('loggedIn', scryerId);
}

function handleLogin(scryerId) {
	var client = this;
	var clientId = client.id;

	// The first thing we do is check to see if that scryer is already logged
	// in.

	if (tDimension.scryers.hasOwnProperty(scryerId)) {
		console.log(scryerId, ' is already logged in');
		return client.remoteEmit('scryerError', 'alreadyLoggedIn');
	}

	var scryer = new Scryer(scryerId);

	scryer.once('ready', function (error) {
		if (!sm.clients.hasOwnProperty(clientId)) {
			return console.log('client disconnected before data loaded.', clientId, scryerId);
		}

		if (error) {
			console.error('error logging in:', error);
			return client.remoteEmit('scryerError', error);
		}

		login(client, scryer);
	});
}

function addClient(clientId) {
	console.log(clientId, 'connected.');

	newThisTurn[clientId] = tDimension.getVersion();

	var client = sm.clients[clientId];

	// On diff, the client sent us a change to their goal.
	client.on('diff', mergeGoal);

	// On login, the client is trying to login.
	client.on('login', handleLogin);

	// When a client connects, we send them a copy of the dimension. This is
	// synchronized once per turn.
	client.remoteEmit('dimension', tDimension);

	// We also send them the goals tome. This is synchronized in realtime and
	// is how scryers can influence the dimension.
	client.remoteEmit('goals', tGoals);
}

var webpackOptions = {
	context: path.resolve(__dirname, 'client'),
	entry: {
		index: './index.js'
	},
	module: {
		rules: [
			{
				loader: 'file-loader',
				query: {
					name: '[path][name].[ext]'
				},
				test: /\.(css|html|png)$/
			}
		]
	},
	plugins: [
		new HtmlWebpackPlugin({
			filename: './index.html',
			template: './index.ejs'
		})
	]
};

var webpackDevOptions = {
	index: 'index.html'
};

var gameExpress = express();
gameExpress.use(webpackDevMiddleware(webpack(webpackOptions), webpackDevOptions));

// This starts our express web server listening on either a port or a socket.
var gameServer = gameExpress.listen(port);

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