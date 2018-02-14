console.log('Fresh socks! Get your fresh socks here!');

RECONNECT_DELAY = 1000;

var socky = require('./socky');

var EventEmitter = require('events').EventEmitter;

exports = module.exports = new EventEmitter();

function sockClose(event) {
	exports.emit('close', event);

	setTimeout(function () {
		ws = createSocket();
	}, RECONNECT_DELAY);
}

function sockError(event) {
	exports.emit('error', event);
}

function sockMessage(event) {
	var evt = socky.deserialize(event.data);
	exports.emit(evt.name, evt.data);
}

function sockOpen(event) {
	exports.emit('open', event);
}

function createSocket() {
	var fresh = new WebSocket(location.origin.replace(/^http/, 'ws'));

	fresh.onclose = sockClose;
	fresh.onerror = sockError;
	fresh.onmessage = sockMessage;
	fresh.onopen = sockOpen;

	return fresh;
}

var ws = createSocket();

exports.remoteEmit = function (name, data) {
	ws.send(socky.serialize(name, data));
};
