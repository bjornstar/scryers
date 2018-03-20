var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var crypto = require('crypto');

var WebSocketServer = require('ws').Server;
var socky = require('./socky');

console.log('Fresh socks! Get your fresh socks here!');

var seq = 0;

function newId() {
	return crypto.randomBytes(8).toString('base64');
}

function Client(sm, socket, id) {
	EventEmitter.call(this);

	this.id = id;

	this.broadcast = function (name, data) {
		sm.broadcast(name, data, [ id ]);
	}

	this.close = function () {
		socket.close();
	}

	this.remoteEmit = function (name, data) {
		console.log('Server ->', id, name, data);
		if (socket.readyState !== 1) {
			return console.log('socket not ready', id);
		}
		socket.send(socky.serialize(name, data));
	}
}

inherits(Client, EventEmitter);

function SockMonger(options) {
	EventEmitter.call(this);

	var wss = new WebSocketServer(options);
	var sockets = {};
	var clients = this.clients = {};

	var sm = this;

	function onConnection(socket) {
		var id = newId();

		sockets[id] = socket;

		var client = new Client(sm, socket, id);
		clients[id] = client;

		sm.emit('add', id);

		socket.on('close', function () {
			delete sockets[id];
			delete clients[id];

			client.emit('close');
			client.removeAllListeners();

			sm.emit('del', id);
		});

		socket.on('message', function (data) {
			var evt = socky.deserialize(data);
			console.log(id, '-> Server', evt.name, evt.data);
			client.emit(evt.name, evt.data);
		});
	}

	wss.on('connection', onConnection);

	this.broadcast = function (event, data, exclude) {
		var out = socky.serialize(event, data);
		for (var socketId in sockets) {
			if (exclude && exclude.indexOf(socketId) !== -1) {
				continue;
			}

			var socket = sockets[socketId];
			socket.send(out);
		}
	}
}

inherits(SockMonger, EventEmitter);

module.exports = SockMonger;

