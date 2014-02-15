var fs = require('fs');
var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;

var uuid = require('node-uuid');

function rnd(n) {
	return Math.floor(Math.random() * n);
}

function getScryerPath(id) {
	return './scryers/' + id + '.json';
}

function load(id, callback) {
	console.log('loading scryer:', id);

	var scryerPath = getScryerPath(id);

	fs.readFile(scryerPath, { encoding: 'utf8' }, function (error, data) {
		if (error) {
			return callback(error);
		}

		var out;

		try {
			out = JSON.parse(data);
		} catch (e) {
			console.error('error reading:', scryerPath);
			error = e;
		}

		callback(error, out);
	});
}

function create(scryer) {
	var id = uuid.v4();

	scryer.deck = [];
	scryer.hand = [];
	scryer.id = id;
	scryer.library = {};
	scryer.new = [];
	scryer.public = {
		id: id,
		lastLogin: Date.now(),
		lastLogout: Date.now(),
		name: 'Apprentice Scryer',
		portal: {
			x: rnd(500) + 50,
			y: rnd(400) + 50,
		},
		registered: Date.now(),
		whims: {}
	};
}

function Scryer(id) {
	EventEmitter.call(this);

	this.data = {};

	var that = this;

	if (id === 'create') {
		create(that.data);

		this.save(function (error) {
			that.emit('ready', error);
		});

		return;
	}

	load(id, function (error, loaded) {
		if (!error && loaded) {
			for (var key in loaded) {
				that.data[key] = loaded[key];
			}
		}

		that.emit('ready', error);
	});
}

inherits(Scryer, EventEmitter);

Scryer.prototype.save = function(callback) {
	console.log('saving scryer:', this.data.id);

	var scryerPath = getScryerPath(this.data.id);

	var out = JSON.stringify(this.data, null, '\t');

	var that = this;

	fs.writeFile(scryerPath, out, { encoding: 'utf8' }, function (error) {
		that.emit('saved', error);
		if (typeof callback === 'function') {
			callback(error);
		}
	});
}

module.exports = exports = Scryer;