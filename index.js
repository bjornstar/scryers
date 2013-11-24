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
var appConfig = require('./config/');

var express = require('express');
var fs = require('fs');
var io = require('socket.io');
var Tome = require('tomes').Tome;
var uuid = require('node-uuid');

var build = require('./build');
var analytics = require('./analytics');

// Heroku uses PORT
// AppFog uses VCAP_APP_PORT

var port = process.env.PORT || process.env.VCAP_APP_PORT || 3000;
var chatDuration = 3000;

var tDimension = Tome.conjure({ turn: 0, scryers: {} });
var tSockets = Tome.conjure({});
var tGoals = Tome.conjure({});

var merging;

function nameIsOk(name) {
	// Is the name empty?
	if (name.trim() === '') {
		return false;
	}

	return true;
}

function msToNextTurn() {
	return Date.now() % appConfig.msPerTurn || 1000;
}

var nextTurnTimeout;

function nextTurn() {
//	tDimension.turn.inc();

	sendDiffToAll();

	nextTurnTimeout = setTimeout(nextTurn, msToNextTurn());
}

function rnd(n) {
	return Math.floor(Math.random() * n);
}

function handleSocketDisconnect() {
	var socketId = this.id;

	console.log(socketId + ' disconnected.');

	// Delete the socket from the map, triggering the removal of the player
	// from the dimension.

	tSockets.del(socketId);
}

function handleGoalsReadable() {
	// If we are merging we will use broadcast to send the diff to all clients
	// except for the one who sent it.

	if (merging) {
		return;
	}

	var diff = tGoals.readAll();

	if (diff.length) {
		console.log('goals.diff.broadcast: '+ JSON.stringify(diff));

		// More of the match made in heaven: sockets.emit sends the diff to all
		// connected clients.
		gameIO.sockets.emit('goals.diff', diff);
	}
}

tGoals.on('readable', handleGoalsReadable);

function mergeGoal(diff) {
	var socketId = this.id;
	console.log(socketId + ': ' + JSON.stringify(diff));

	// If we got a diff from a strange socket, just ignore it.
	if (!tSockets[socketId].scryerId) {
		console.log('Invalid socket:', socketId)
		return;
	}

	merging = true;

	// Merge the diff
	tGoals.merge(diff);

	// Throw away the diff since we don't want to do anything with it.
	tGoals.read();

	merging = false;

	// Here is the perfect storm: tomes + socket.io

	// We can simply broadcast the diff which sends it to all clients except
	// for the one that sent it.
	this.broadcast.emit('goals.diff', diff);
}

// We want our chat message to expire after a certain amount of time so that we
// don't have them clogging up our tubes.
function setChatExpire() {
	var that = this;
	
	var chatExpire = setTimeout(function () {
		// Shift the chat message off the front of the array, the magic of
		// of tomes updates all our clients.
		that.shift();
	}, chatDuration);

	// It's possible that our scryer disconnects before the chat expires. In
	// tha case, clear the timeout so we are not modifying destroyed tomes.

	this.on('destroy', function () {
		clearTimeout(chatExpire);
	});
}

function handleLogin(scryerId) {
	var socket = this;
	var socketId = this.id;

	console.log(socketId + ': login as', scryerId);

	var scryerPath = './scryers/' + scryerId + '.json';

	fs.readFile(scryerPath, { encoding: 'utf8' }, function (error, data) {
		if (error) {
			console.log(error);
			return socket.emit('scryerError', error);
		}

		var dataScryer;

		try {
			scryerData = JSON.parse(data);
		} catch (e) {
			console.log('error reading:', scryerPath )
			return socket.emit('scryerError', e);
		}

		var goalData = {
			pos: scryerData.pos,
			chat: []
		};

		// Add the scryer to our scryers tome and all clients will automagically
		// get updated at the end of this turn.
		tDimension.scryers.set(scryerId, scryerData);

		// Add the scryer to our goals, which gets updated in realtime.
		tGoals.set(scryerId, goalData);

		// When we receive a chat message, queue it up for deletion after a period
		// of time.
		tGoals[scryerId].chat.on('add', setChatExpire);
		
		// Map the scryerId to socketId so we know which socket belongs to which
		// scryer.
		tSockets[socketId].set('scryerId', scryerId);

		tSockets[socketId].on('destroy', function () {
			console.log(socketId, 'disconnected. deleting', scryerId, '.');
			tDimension.scryers.del(scryerId);
			tGoals.del(scryerId);
			analytics.track({ userId: scryerId, event: 'disconnected' });
		});

		// And tell the client who is logging in what their scryerId is.
		socket.emit('loggedIn', scryerId);
	});
}

function handleRegister(name, catType, propType) {
	var socket = this;
	var socketId = this.id;

	console.log(socketId + ': register as', name, catType, propType);

	// Let's set some random values as defaults
	var rndX = rnd(500) + 50;
	var rndY = rnd(400) + 50;
	var rndCat = rnd(10) + 1;
	var rndProp = rnd(7) + 1;

	// This is where your scryer is born.
	var newScryer = {
		id: uuid.v4(),
		name: name,
		catType: catType || 'c' + rndCat,
		propType: propType || 'a' + rndProp,
		pos: {
			x: rndX,
			y: rndY,
			d: 'r'
		},
		registered: Date.now(),
		lastseen: Date.now()
	};

	var scryerId = newScryer.id;

	var stringifiedScryer = JSON.stringify(newScryer, null, '\t');

	var scryerPath = './scryers/' + scryerId + '.json';

	fs.writeFile(scryerPath, stringifiedScryer, function (error) {
		if (error) {
			console.log(error);
			return socket.emit('scryerError', error);
		}

		socket.emit('registered', scryerId);

		analytics.identify({ userId: scryerId, traits: { name: name, catType: catType, propType: propType } });
	});
}

function clientConnect(socket) {
	console.log(socket.id + ' connected.');
	
	// Register this socket in our socket tome. We will associate the player
	// with the socket once they log in.
	tSockets.set(socket.id, {});

	// When a client connects, we send them a copy of the dimension. This is
	// synchronized once per turn.
	socket.emit('dimension', tDimension);

	// We also send them the goals tome. This is synchronized in realtime and
	// is how scryers can influence the dimension.
	socket.emit('goals', tGoals);

	// On disconnect, clean up.
	socket.on('disconnect', handleSocketDisconnect);

	// On diff, the client sent us a change to their goal.
	socket.on('diff', mergeGoal);

	// On login, the client is trying to login.
	socket.on('login', handleLogin);

	// On register, the client needs to create an account.
	socket.on('register', handleRegister);
}

function isNumber (o) {
	// For checking if the port is a number or a file.
	if (typeof o === 'number' || parseInt(o, 10) == o) {
		return true;
	}
	return false;
}

var gameExpress = express();

// Some handy express builtins.
gameExpress.use(express.favicon());
gameExpress.use(express.logger('dev'));

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

// Stick socket.io on express and we're off to the races.
var gameIO = io.listen(gameServer);

gameIO.set('log level', 1);
gameIO.sockets.on('connection', clientConnect);

function sendDiffToAll() {
	// If we are merging we will use broadcast to send the diff to all clients
	// except for the one who sent it.

	if (merging) {
		return;
	}

	var diff = tDimension.readAll();

	if (diff.length) {
		console.log('dimension.diff.broadcast: '+ JSON.stringify(diff));

		// More of the match made in heaven: sockets.emit sends the diff to all
		// connected clients.
		gameIO.sockets.emit('dimension.diff', diff);
	}
}

// Start the turnEngine.
nextTurn();