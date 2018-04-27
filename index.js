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

const express = require('express');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const Tome = require('@bjornstar/tomes');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');

const appConfig = require('./config');
const move = require('./lib/move');
const SockMonger = require('./lib/sockmonger');
const Scryer = require('./lib/scryer');

const port = appConfig.port || 3000;

const tDimension = Tome.conjure({ turn: 0, scryers: {} });
const tGoals = Tome.conjure({});

const newThisTurn = {};
const loggingIn = {};

let merging = false;
let nextTurnTimeout = null;

function msToNextTurn() {
	return Date.now() % appConfig.msPerTurn || 1000;
}

// This holds all of the whims that need to move.
const moving = {};

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
	const clientId = this.id;

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
	const scryerId = this.getParent().getKey();
	const scryer = tDimension.scryers[scryerId];

	const whimIds = Object.keys(scryer.whims);

	for (let i = 0; i < whimIds.length; i += 1) {
		let whimId = whimIds[i];
		let whim = scryer.whims[whimId];

		moving[whimId] = { pos: whim.pos, goal: this, speed: whim.speed };

		// If our whim gets deleted while it's moving, we need to remove it
		// from the moving list.

		whim.on('destroy', function () {
			delete moving[whimId];
		});
	}
}

function login(client, scryer) {
	const clientId = client.id;
	const scryerId = scryer.id;

	const goalData = {
		pos: scryer.portal
	};

	// Sneakily bump the lastLogin before it gets turned into a tome.
	scryer.lastLogin = Date.now();

	// Add the scryer to our scryers tome and all clients will automagically
	// get updated at the end of this turn.
	tDimension.scryers.set(scryerId, scryer);

	// Add the goal to our goals tome, which gets updated in realtime.
	tGoals.set(scryerId, goalData);

	tGoals[scryerId].pos.on('readable', newGoalPos);

	client.once('close', function () {
		console.log(clientId, 'disconnected. logging out', scryerId, '.');

		tDimension.scryers[scryerId].set('lastLogout', Date.now());

		scryer.save().catch(function (error) {
			console.log('error saving:', scryerId, error)
		}).then(function () {
			tDimension.scryers.del(scryerId);
			tGoals.del(scryerId);
		});
	});

	// Tell the client who is logging in what their scryerId is.
	client.remoteEmit('loggedIn', scryerId);
}

function handleLogin(scryerId) {
	const client = this;
	const clientId = client.id;

	// The first thing we do is check to see if that scryer is already logging
	// in.

	if (loggingIn[scryerId]) {
		console.log(scryerId, 'is already logging in');
		return client.remoteEmit('scryerError', 'alreadyLoggingIn');
	}

	loggingIn[scryerId] = true;

	if (tDimension.scryers.hasOwnProperty(scryerId)) {
		console.log(scryerId, 'is already logged in');
		return client.remoteEmit('scryerError', 'alreadyLoggedIn');
	}

	Scryer.load(scryerId).then(function (scryer) {
		if (!sm.clients.hasOwnProperty(clientId)) {
			return console.log('client disconnected before data loaded.', clientId, scryerId);
		}

		delete loggingIn[scryerId];
		login(client, scryer);
	}).catch(function (error) {
		if (error.code === 'ENOENT') {
			console.log(`Unknown scryer: ${scryerId}`);
			return client.remoteEmit('scryerError', 'scryerNotFound');
		}

		console.log('error logging in:', error);
		client.remoteEmit('scryerError', error);
	});
}

function handleRegister(name) {
	const scryer = Scryer.create({ name });

	login(this, scryer);
}

function addClient(clientId) {
	console.log(clientId, 'connected.');

	newThisTurn[clientId] = tDimension.getVersion();

	const client = sm.clients[clientId];

	// On diff, the client sent us a change to their goal.
	client.on('diff', mergeGoal);

	client.on('login', handleLogin);
	client.on('register', handleRegister);

	// When a client connects, we send them a copy of the dimension. This is
	// synchronized once per turn.
	client.remoteEmit('dimension', tDimension);

	// We also send them the goals tome. This is synchronized in realtime and
	// is how scryers can influence the dimension.
	client.remoteEmit('goals', tGoals);
}

const webpackOptions = {
	context: path.resolve(__dirname, 'client'),
	entry: {
		index: './index.js'
	},
	mode: 'none',
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

const gameExpress = express();
gameExpress.use(webpackDevMiddleware(webpack(webpackOptions), {}));

// This starts our express web server listening on either a port or a socket.
const gameServer = gameExpress.listen(port);

const sm = new SockMonger({ server: gameServer });

sm.on('add', addClient);
sm.on('del', delClient);

function handleGoalsReadable() {
	// If we are merging we will use broadcast to send the diff to all clients
	// except for the one who sent it.

	if (merging || !tGoals.isDirty()) {
		return;
	}

	const diffs = tGoals.readAll();

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

	const currentVersion = tDimension.getVersion();

	const diffs = tDimension.readAll();

	const exclude = [];


	for (let newId in newThisTurn) {
		exclude.push(newId);

		let trimmedDiffs = diffs.slice(diffs.length - (currentVersion - newThisTurn[newId]));
		sm.clients[newId].remoteEmit('dimension.diff', trimmedDiffs);

		delete newThisTurn[newId];
	}

	sm.broadcast('dimension.diff', diffs, exclude);
}

// Start the turnEngine.
nextTurn();
