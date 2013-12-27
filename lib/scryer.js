var fs = require('fs');
var uuid = require('node-uuid');

function rnd(n) {
	return Math.floor(Math.random() * n);
}

function getScryerPath(scryerId) {
	return './scryers/' + scryerId + '.json';
}

exports.create = function(data) {
	// Let's set some random values as defaults
	var rndX = rnd(500) + 50;
	var rndY = rnd(400) + 50;

	var newScryer = {
		id: uuid.v4(),
		lastlogin: Date.now(),
		lastlogout: Date.now(),
		name: data.name,
		portal: {
			x: rndX,
			y: rndY
		},
		whims: {},
		registered: Date.now()
	};

	return newScryer;
};

exports.save = function(scryer, callback) {
	console.log('saving scryer:', scryer.id.valueOf());

	var scryerPath = getScryerPath(scryer.id);

	var out = JSON.stringify(scryer, null, '\t');

	fs.writeFile(scryerPath, out, { encoding: 'utf8' }, function (error) {
		if (error) {
			return callback(error);
		}

		callback();
	});
}

exports.load = function(scryerId, callback) {
	console.log('loading scryer:', scryerId);

	var scryerPath = getScryerPath(scryerId);

	fs.readFile(scryerPath, { encoding: 'utf8' }, function (error, data) {
		if (error) {
			return callback(error);
		}

		var scryer;

		try {
			scryer = JSON.parse(data);
		} catch (e) {
			console.log('error reading:', scryerPath )
			return callback(error);
		}

		callback(null, scryer);
	});
}
