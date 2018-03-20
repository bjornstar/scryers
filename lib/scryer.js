const fs = require('fs');
const util = require('util');
const uuid = require('uuid');

const { promisify } = util;

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

function rnd(n) {
	return Math.floor(Math.random() * n);
}

function getScryerPath(id) {
	return './scryers/' + id + '.json';
}

const fileOptions = { encoding: 'utf8' };

class Scryer {
	constructor(data) {
		Object.assign(this, data);
	}

	save() {
		const scryerPath = getScryerPath(this.id);
		const data = JSON.stringify(this, null, '\t');

		return writeFile(scryerPath, data, fileOptions);
	}
}

Scryer.create = function ({ name }) {
	const id = uuid.v4();
	const now = Date.now();

	name = name || 'Apprentice Scryer';

	return new Scryer({
		id,
		lastLogin: now,
		lastLogout: now,
		name,
		portal: {
			x: rnd(500) + 50,
			y: rnd(400) + 50,
		},
		registered: now,
		whims: {}
	});
};

Scryer.load = function (id) {
	const scryerPath = getScryerPath(id);

	return readFile(scryerPath, fileOptions).then(function (data) {
		let parsedData = {};

		try {
			parsedData = JSON.parse(data);
		} catch (e) {
			console.log('error parsing:', scryerPath, data);
			throw e;
		}

		return new Scryer(parsedData);
	});
};

module.exports = exports = Scryer;
