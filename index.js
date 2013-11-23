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
var io = require('socket.io');
var Tome = require('tomes').Tome;

var build = require('./build');
var analytics = require('./analytics');

// Heroku uses PORT
// AppFog uses VCAP_APP_PORT

var port = process.env.PORT || process.env.VCAP_APP_PORT || 3000;
var chatDuration = 3000;

var game = {
	turn: 0,
	cats: {}
};

var tGame = Tome.conjure(game);
var cats = tGame.cats
var tSockets = Tome.conjure({});
var merging;

function nameIsOk(name) {
	// Is there already a cat with that name?
	if (cats.hasOwnProperty(name)) {
		return false;
	}

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
//	tGame.turn.inc();

	sendDiffToAll();

	nextTurnTimeout = setTimeout(nextTurn, msToNextTurn());
}

function rnd(n) {
	return Math.floor(Math.random() * n);
}

function handleSocketDisconnect() {
	// When we get a disconnect we need to do a few things.
	console.log(this.id + ' disconnected.');

	// Delete the socket from the map, triggering the removal of the player
	// from the game.

	tSockets.del(this.id);
}

function mergeDiff(diff) {
	console.log(this.id + ': ' + JSON.stringify(diff));

	// If we got a diff from a strange socket, just ignore it.
	if (!tSockets[this.id].name) {
		console.log('Invalid socket:', this.id)
		return; // has no cat.
	}

	// Set merging to true so we know that any readable emission is from a
	// merge.
	merging = true;

	// Merge the diff
	cats.merge(diff);

	// Throw away the diff since we don't want to do anything with it.
	cats.read();

	// And now we are done with merging.
	merging = false;

	// Here is the perfect storm: tomes + socket.io

	// We can simply broadcast the diff which sends it to all clients except
	// for the one that sent it.
	this.broadcast.emit('diff', diff);
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

	// It's possible that our cat disconnects before the chat expires. In that
	// case, clear the timeout so we are not modifying destroyed tomes.

	this.on('destroy', function () {
		clearTimeout(chatExpire);
	});
}

function handleLogin(name, catType, propType, pos) {
	console.log('login:', this.id, name);
	// If the client has a bad name, tell them.
	if (!nameIsOk(name)) {
		return this.emit('badname');
	}

	// If the client is just changing their name, perform a rename. No need to
	// set anything else up. Tomes allows us to change keys without losing
	// references.
	if (tSockets.hasOwnProperty(this.id) && tSockets[this.id].hasOwnProperty('name')) {
		cats.rename(tSockets[this.id].name, name);
		return this.emit('loggedIn', name);
	}

	// Let's set some random values as defaults
	var rndX = rnd(500) + 50;
	var rndY = rnd(400) + 50;
	var rndCat = rnd(10) + 1;
	var rndProp = rnd(7) + 1;

	// This is where your kitty is born.
	var newCat = {
		catType: catType || 'c' + rndCat,
		propType: propType || 'a' + rndProp,
		pos: {
			x: pos ? pos.x : rndX,
			y: pos ? pos.y : rndY,
			d: pos ? pos.d : 'r'
		},
		chat: []
	};

	// Add the cat to our cats tome and all clients will automagically get
	// updated. 
	cats.set(name, newCat);

	// When we receive a chat message, queue it up for deletion after a period
	// of time.
	cats[name].chat.on('add', setChatExpire);
	
	// Add the name to the map with the socket.id as the key so we know which
	// socket belongs to which player.
	tSockets[this.id].set('name', name);

	tSockets[this.id].on('destroy', function () {
		cats.del(name);
		analytics.track({ userId: this.id, event: 'disconnected' });
	});

	// And tell the client who is logging in what their cat's name is.
	this.emit('loggedIn', name);

	analytics.identify({ userId: this.id, traits: { name: name } });
}

function clientConnect(socket) {
	console.log(socket.id + ' connected.');
	
	// Register this socket in our socket tome. We will associate the player
	// with the socket once they log in.
	tSockets.set(socket.id, {});

	// When a client connects, we send them a copy of the game tome. Once they
	// have that, all updates are automatic.
	socket.emit('game', tGame);

	// On disconnect, clean up.
	socket.on('disconnect', handleSocketDisconnect);

	// On diff, the client sent us a change to their cat.
	socket.on('diff', mergeDiff);

	// On login, the client is trying to login.
	socket.on('login', handleLogin);

	analytics.track({ userId: socket.id, event: 'connected' });
}

function isNumber (o) {
	// For checking if the port is a number or a file.
	if (parseInt(o, 10) == o) {
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

	var diff = tGame.readAll();

	if (diff.length) {
		console.log('broadcast: '+ JSON.stringify(diff));

		// More of the match made in heaven: sockets.emit sends the diff to all
		// connected clients.
		gameIO.sockets.emit('diff', diff);
	}
}

nextTurn();