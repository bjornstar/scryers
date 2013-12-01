console.log('Fresh socks! Get your fresh socks here!');

var socky = require('./socky');

var EventEmitter = require('emitter');

exports = module.exports = new EventEmitter();

function sockClose(event) {
	exports.emit('close');
}

function sockError(event) {
	exports.emit('error');
}

function sockMessage(event) {
	var evt = socky.deserialize(event.data);
	exports.emit(evt.name, evt.data);
}

function sockOpen (event) {
	exports.emit('open');
}

var ws = new WebSocket(location.origin.replace(/^http/, 'ws'));

ws.onclose = sockClose;
ws.onerror = sockError;
ws.onmessage = sockMessage;
ws.onopen = sockOpen;

exports.ws = ws;

exports.remoteEmit = function (name, data) {
	ws.send(socky.serialize(name, data));
}