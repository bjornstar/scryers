const crypto = require('crypto');
const EventEmitter = require('events').EventEmitter;
const WebSocketServer = require('ws').Server;

const socky = require('./socky');

console.log('Fresh socks! Get your fresh socks here!');

function newId() {
	return crypto.randomBytes(8).toString('base64');
}

class Client extends EventEmitter {
	constructor(sm, socket, id) {
		super();

		this.id = id;
		this.sm = sm;
		this.socket = socket;
	}


	broadcast(name, data) {
		this.sm.broadcast(name, data, [ this.id ]);
	}

	close() {
		this.socket.close();
	}

	remoteEmit(name, data) {
		if (this.socket.readyState === 1) {
			this.socket.send(socky.serialize(name, data));
		}
	}
}

class SockMonger extends EventEmitter {
	constructor(options) {
		super();

		this.wss = new WebSocketServer(options);
		this.sockets = {};
		this.clients = {};

		this.wss.on('connection', this.onConnection.bind(this));
	}

	onConnection(socket) {
		const id = newId();

		this.sockets[id] = socket;

		const client = new Client(this, socket, id);
		this.clients[id] = client;

		socket.on('close', () => {
			delete this.sockets[id];
			delete this.clients[id];

			client.emit('close');
			client.removeAllListeners();

			this.emit('del', id);
		});

		socket.on('message', rawData => {
			const { name, data } = socky.deserialize(rawData);
			console.log(id, '-> Server', name, data);
			client.emit(name, data);
		});

		this.emit('add', id);
	}

	broadcast(event, data, exclude = []) {
		const out = socky.serialize(event, data);

		for (let socketId in this.sockets) {
			if (!exclude.includes(socketId)) {
				this.sockets[socketId].send(out);
			}
		}
	}
}

module.exports = SockMonger;

